// Normalize the SQLite source before generating bundles. Use --report to save a decision record.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{resolveCatalog}=require('./catalog-resolution.cjs');
const {syncLearningIndex}=require('./sync-learning-index.cjs');
const root=path.resolve(__dirname,'..'),original=JSON.parse(execFileSync('python3',[path.join(root,'scripts/catalog-db.py'),'export'],{maxBuffer:32*1024*1024}));
// Rebuild actor acquisition before resolution so an old derived binding cannot
// overwrite a reviewed learning correction or retain an obsolete unknown flag.
const {data,report}=resolveCatalog(syncLearningIndex(structuredClone(original)));
const decisions=[...report.selectedEffects.map(r=>({kind:'effect',...r})),...report.selectedBindings.map(r=>({kind:'acquisition',...r})),...report.selectedParameters.map(r=>({kind:'parameter',...r}))];
if(decisions.length){
 const target=path.join(root,'data/research/catalog-selection-history.json'),history=fs.existsSync(target)?JSON.parse(fs.readFileSync(target,'utf8')):{policyVersion:report.policyVersion,decisions:{}};
 for(const decision of decisions){const key=crypto.createHash('sha256').update(JSON.stringify(decision)).digest('hex').slice(0,20);history.decisions[key]=decision}
 fs.writeFileSync(target,JSON.stringify(history,null,2)+'\n');
}
const reportIndex=process.argv.indexOf('--report');if(reportIndex>=0){if(!process.argv[reportIndex+1])throw Error('Pass a report path');fs.writeFileSync(process.argv[reportIndex+1],JSON.stringify(report,null,2)+'\n')}
if(JSON.stringify(data)!==JSON.stringify(original)){
 const source=path.join(root,'data/catalog.json');fs.writeFileSync(source,JSON.stringify(data,null,2)+'\n');execFileSync('python3',[path.join(root,'scripts/catalog-db.py'),'import','--source',source]);
}
console.log(`Selected catalogue: ${report.abilities} single-effect abilities, ${report.linkedLearning} linked learning records.`);
