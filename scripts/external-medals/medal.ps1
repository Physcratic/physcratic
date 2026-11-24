[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('lookup','award','revoke')][string]$Action,
    [string]$Email = '',
    [string]$Handle = '',
    [ValidateSet('IPhO','APhO','EuPhO','National')][string]$Competition,
    [ValidateSet('gold','silver','bronze','honourable-mention')][string]$Award,
    [int]$Year = 0,
    [AllowEmptyString()][ValidatePattern('^([A-Z]{2})?$')][string]$Country = '',
    [ValidateLength(0,120)][string]$CompetitionName = '',
    [ValidatePattern('^[A-Za-z0-9_-]{1,100}$')][string]$TallyReference,
    [guid]$MedalId = [guid]::Empty
)
$ErrorActionPreference = 'Stop'
if (-not ($Email.Trim() -or $Handle.Trim())) { throw 'Enter an account email or handle.' }
if (-not $env:PGSERVICE -and -not ($env:PGHOST -and $env:PGDATABASE -and $env:PGUSER)) {
    throw 'Set PGSERVICE or PGHOST, PGDATABASE and PGUSER to the approved operator connection.'
}
if ($Action -eq 'award' -and (-not ($Competition -and $Award -and $Year -and $TallyReference) -or
        ($Competition -eq 'National' -and -not ($Country -and $CompetitionName.Trim())))) {
    throw 'Supply the competition, award, year and Tally reference. National awards also require the country and competition name.'
}
if ($Action -eq 'revoke' -and $MedalId -eq [guid]::Empty) { throw 'Supply the medal ID from lookup.' }
$competitionNames = @{ ipho = 'IPhO'; apho = 'APhO'; eupho = 'EuPhO'; national = 'National' }
if ($Competition) { $Competition = $competitionNames[$Competition] }
# Pass text through the environment so Windows PowerShell preserves embedded quotes.
$inputs = @{
    EMAIL = $Email.Trim()
    HANDLE = $Handle.Trim()
    COMPETITION = $Competition
    AWARD = ([string]$Award).ToLowerInvariant()
    YEAR = $Year.ToString()
    COUNTRY = $Country.ToUpperInvariant()
    COMPETITION_NAME = $CompetitionName.Trim()
    TALLY_REFERENCE = $TallyReference
    MEDAL_ID = $MedalId.ToString()
}
$previous = @{}
try {
    foreach ($key in $inputs.Keys) {
        $name = "PHYSCRATIC_MEDAL_$key"
        $previous[$name] = [Environment]::GetEnvironmentVariable($name)
        [Environment]::SetEnvironmentVariable($name, [string]$inputs[$key])
    }
    & psql '-X' "--file=$PSScriptRoot/operate.sql" "--set=lookup=$($Action -eq 'lookup')" `
        "--set=award_operation=$($Action -eq 'award')"
    if ($LASTEXITCODE -ne 0) { throw "psql exited with status $LASTEXITCODE." }
} finally {
    foreach ($name in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previous[$name])
    }
}
