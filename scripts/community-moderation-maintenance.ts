// Explicit operator invocation only. Never imported from application code or startup.
// COMMUNITY_MAINTENANCE_DATABASE_URL must name the separately approved target.
import {Pool} from 'pg';
import {pruneModerationPage,type MaintenanceArea} from '../lib/community/moderation-maintenance';
async function main(){
const [area,...cursor]=process.argv.slice(2);
if(!process.env.COMMUNITY_MAINTENANCE_DATABASE_URL||!['moderation','comments','content','spam'].includes(area))throw new Error('Select an approved database, area and optional returned cursor. See COMMUNITY_LAUNCH_RUNBOOK.md.');
const pool=new Pool({connectionString:process.env.COMMUNITY_MAINTENANCE_DATABASE_URL,max:1,options:'-c search_path=public,pg_catalog'}),client=await pool.connect();
try{await client.query('BEGIN');const result=await pruneModerationPage(client,area as MaintenanceArea,cursor);await client.query('COMMIT');console.log(JSON.stringify({area,...result}));}catch{await client.query('ROLLBACK');throw new Error('Maintenance failed. Transaction rolled back. Check the selected target and operator permissions.');}finally{client.release();await pool.end();}

}
void main();
