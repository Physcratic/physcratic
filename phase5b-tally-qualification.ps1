$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'Physcratic-Phase5B-Blob'
if (!(Test-Path -LiteralPath (Join-Path $root 'blob-fixtures.ready'))) {
    throw 'Use the separate completed Blob fixture on port 55440.'
}
$state = Get-Content -LiteralPath (Join-Path $root 'fixture-state.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($state.port -ne 55440 -or $state.appPort -ne 3318 -or $state.withCompletions -or
    [IO.Path]::GetFullPath($state.data) -ine (Join-Path $root 'data')) { throw 'Wrong fixture.' }
$repo = (Resolve-Path -LiteralPath $state.repo).Path
$head = & git -C $repo rev-parse HEAD
if ($LASTEXITCODE -ne 0 -or $head -cnotin @(
    '02f09e0ce449c96d4da0d9dc36b27c3455db7766',
    'd0293333a56ce126982de5ac220a6730a6a64e69'
)) { throw 'Use the native-kit checkout recorded by the Blob fixture.' }
if (!(Test-Path -LiteralPath (Join-Path $repo 'node_modules/pg/package.json') -PathType Leaf)) {
    throw 'The existing native-kit pg dependency is missing.'
}
$form = (Read-Host 'Open Tally and paste the published URL of the approved nonproduction test form').Trim()
if ($form -cnotmatch '\Ahttps://tally\.so/r/[A-Za-z0-9]+\z' -or $form -ceq 'https://tally.so/r/rD5oVX') {
    throw 'Use the exact approved Tally test form URL.'
}
if ((Read-Host 'Type TEST FORM after verifying its downstream routes are approved for synthetic submissions') -cne 'TEST FORM') {
    throw 'Confirm the isolated test form first.'
}
$caseCode = 'PHASE5B-' + [guid]::NewGuid().ToString('N').Substring(0,8).ToUpperInvariant()
$cases = @(
    @{ Label = 'AWARDED'; Email = 'phase5b-b@example.invalid' },
    @{ Label = 'UNAWARDED'; Email = 'phase5b-b@example.invalid' },
    @{ Label = 'AMBIGUOUS'; Email = 'phase5b-ambiguous@example.invalid' }
)
$ascii = [Text.Encoding]::ASCII
foreach ($case in $cases) {
    $marker = "$caseCode-$($case.Label)"
    $stream = "BT /F1 14 Tf 36 100 Td (SYNTHETIC TEST ONLY $marker) Tj ET`n"
    $objects = @(
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 520 150] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ("<< /Length {0} >>`nstream`n{1}endstream" -f $ascii.GetByteCount($stream), $stream)
    )
    $pdf = "%PDF-1.4`n"
    $offsets = @(0)
    for ($i = 0; $i -lt $objects.Count; $i++) {
        $offsets += $ascii.GetByteCount($pdf)
        $pdf += "$($i + 1) 0 obj`n$($objects[$i])`nendobj`n"
    }
    $xref = $ascii.GetByteCount($pdf)
    $pdf += "xref`n0 6`n0000000000 65535 f `n"
    foreach ($offset in $offsets[1..5]) { $pdf += ('{0:D10} 00000 n ' -f $offset) + "`n" }
    $pdf += "trailer`n<< /Size 6 /Root 1 0 R >>`nstartxref`n$xref`n%%EOF`n"
    $file = Join-Path $root "$marker.pdf"
    [IO.File]::WriteAllBytes($file, $ascii.GetBytes($pdf))
    Write-Host "Case: $marker"
    Write-Host "Email: $($case.Email)"
    Write-Host "Attachment: $file"
}
Write-Host 'Submit each case once. Use its exact case marker as the name or notes. Use IPhO, gold, 2025, ID if requested.'
Write-Host 'For the ambiguous case use the printed unresolved email and no verified account link.'
Start-Process $form

$awarded = (Read-Host 'After submitting all three cases, enter AWARDED Submission ID').Trim()
$unawarded = (Read-Host 'Enter UNAWARDED Submission ID').Trim()
$ambiguous = (Read-Host 'Enter AMBIGUOUS Submission ID').Trim()
foreach ($id in @($awarded, $unawarded, $ambiguous)) {
    if ($id -cnotmatch '\A[A-Za-z0-9_-]{1,100}\z') { throw 'Use exact Tally Submission IDs.' }
}
if (@(@($awarded, $unawarded, $ambiguous) | Sort-Object -CaseSensitive -Unique).Count -ne 3) {
    throw 'Expected three distinct Submission IDs.'
}
$verify = @'
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const [root, awarded, unawarded, ambiguous] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(path.join(root, "fixture-state.json"), "utf8"));
const expected = fs.realpathSync(path.join(root, "data"));
assert.equal(path.basename(root), "Physcratic-Phase5B-Blob");
assert.equal(state.port, 55440);
assert.equal(state.appPort, 3318);
assert.equal(state.withCompletions, false);
assert.equal(fs.realpathSync(state.data), expected);
assert.match(state.secrets.admin, /^[a-f0-9]{64}$/);
const client = new Client({
  host:"127.0.0.1", port:55440, database:"physcratic_authoring_test",
  user:"phase5b_cluster_admin", password:state.secrets.admin, ssl:false,
  connectionTimeoutMillis:5000, statement_timeout:10000
});
const ids = [awarded, unawarded, ambiguous];
const empty = () => client.query(
  "SELECT 1 FROM public.community_external_medal WHERE tally_reference=ANY($1::text[])", [ids]
);
async function main() {
  await client.connect();
  try {
    const { rows:[t] } = await client.query(`SELECT host(inet_server_addr()) AS host,
      inet_server_port() AS port, current_database() AS db, session_user AS login,
      current_user AS effective, current_setting('data_directory') AS dir,
      current_setting('server_version_num') AS version, pg_is_in_recovery() AS recovery`);
    assert.equal(fs.realpathSync(t.dir), expected);
    delete t.dir;
    assert.deepEqual(t, {host:"127.0.0.1", port:55440, db:"physcratic_authoring_test",
      login:"phase5b_cluster_admin", effective:"phase5b_cluster_admin", version:"180007", recovery:false});
    await client.query("BEGIN; SET LOCAL ROLE phase5b_owner; SET LOCAL search_path=pg_catalog,public,pg_temp");
    try {
      assert.equal((await empty()).rowCount, 0);
      const { rows } = await client.query(
        'SELECT u.id FROM public."user" u WHERE u.email=$1 AND u."emailVerified"',
        ["phase5b-b@example.invalid"]
      );
      assert.deepEqual(rows, [{id:"synthetic-phase5b-b"}]);
      assert.equal((await client.query('SELECT 1 FROM public."user" WHERE email=$1',
        ["phase5b-ambiguous@example.invalid"])).rowCount, 0);
      const { rows:[award] } = await client.query(
        "SELECT * FROM public.community_external_medal_award($1,'IPhO','gold',2025,'ID','',$2)",
        [rows[0].id, awarded]
      );
      assert.equal(award.result, "awarded");
      const { rows: matches } = await client.query(
        `SELECT user_id, tally_reference, revoked_at FROM public.community_external_medal
         WHERE tally_reference=ANY($1::text[])`, [ids]
      );
      assert.deepEqual(matches, [{user_id:"synthetic-phase5b-b", tally_reference:awarded, revoked_at:null}]);
      assert.equal((await client.query(
        "SELECT 1 FROM public.community_external_medal_audit WHERE medal_id=$1 AND action='award'",
        [award.medal_id]
      )).rowCount, 1);
    } finally {
      await client.query("ROLLBACK");
    }
    assert.equal((await empty()).rowCount, 0);
    console.log("AWARDED_MATCH=1");
    console.log("UNAWARDED_DB_MATCH=0");
    console.log("AMBIGUOUS_DB_MATCH=0");
    console.log("SYNTHETIC_AWARD_ROLLED_BACK");
  } finally {
    await client.end();
  }
}
main().catch(() => {
  console.error("TALLY_FIXTURE_CHECK_FAILED. Leave Tally submissions untouched.");
  process.exitCode=1;
});
'@
Push-Location -LiteralPath $repo
try {
    $verify | & node - $root $awarded $unawarded $ambiguous
    if ($LASTEXITCODE -ne 0) { throw 'Local qualification failed. Leave Tally submissions untouched.' }
} finally {
    Pop-Location
}
