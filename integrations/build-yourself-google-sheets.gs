/**
 * UpNext Care — Build Yourself → Google Sheets.
 * Apps Script Web App, deploy as owner; access: Anyone.
 * Authenticated POSTs are validated against Firebase Authentication before writing.
 * Only opt-in scores and activity metadata are sent; journal answers are never accepted.
 *
 * Run setup() ONCE in the spreadsheet-bound Apps Script project.
 * Then deploy a Web App (execute as Me) and configure its /exec URL in
 * build-yourself/sheet-sync-config.js on the website.
 */
const SPREADSHEET_ID = '1IGLKB6M-lUTysMwiKit45F93gqY4lzNfO_YyRReYA9Q';
const FIREBASE_API_KEY = 'AIzaSyAaARE8YP5NFHyTShsnu17vb9RklIcFw_0'; // public project key; NOT an admin secret
const MODULE_NAMES = ['Intentionality','Relationships','Purpose','Ambition','Spirituality','Career'];
const SAFE_ACTIONS = new Set(['assessment','experiment','cycle','consent']);
function doGet() {return ContentService.createTextOutput('UpNext Build Yourself sync service');}
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 18000) throw new Error('Invalid payload');
    const data = JSON.parse(raw);
    if (data.type !== 'build_yourself_sync' || data.consent !== true) throw new Error('Invalid type or consent');
    const token = String(data.idToken || '');
    if (!token || token.length > 6500) throw new Error('Missing authentication');
    const auth = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY, {
      method:'post', contentType:'application/json', payload: JSON.stringify({idToken:token}),
      muteHttpExceptions: true
    });
    if (auth.getResponseCode()!==200) throw new Error('Invalid authentication');
    const result = JSON.parse(auth.getContentText());
    const uid = String(result.users && result.users[0] && result.users[0].localId || '');
    if (!/^[A-Za-z0-9:_-]{4,150}$/.test(uid)) throw new Error('Invalid participant');
    const entries = Array.isArray(data.events) ? data.events.slice(0,20) : [];
    const book = SpreadsheetApp.openById(SPREADSHEET_ID);
    const lock = LockService.getScriptLock();lock.waitLock(25000);
    try {
      const now = new Date().toISOString();
      const participantSheet = book.getSheetByName('Participants');
      const assessSheet = book.getSheetByName('Assessments');
      const activitySheet = book.getSheetByName('Activity');
      const consentSheet = book.getSheetByName('Consent');
      // Use a hash instead of a Firebase UID in the spreadsheet.
      const pseudo = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, uid)
        .map(b=>('0'+(b&255).toString(16)).slice(-2)).join('').slice(0,32);
      const sheets = [assessSheet,activitySheet,consentSheet];
      if (!participantSheet || sheets.some(s=>!s)) throw new Error('Missing target sheets');
      const locale = ['pt','en','es'].includes(data.language) ? data.language : 'en';
      const pRecords = participantSheet.getLastRow()>1
        ? participantSheet.getRange(2,1,participantSheet.getLastRow()-1,1).getValues().flat() : [];
      const pIndex = pRecords.indexOf(pseudo);
      const prior = pIndex>=0 ? participantSheet.getRange(pIndex+2,1,1,10).getValues()[0] : null;
      const row = [pseudo, prior?prior[1]:now,now,locale,
        Number(data.startedModules||0),Number(data.completedModules||0),
        Number(data.completedExperiments||0),String(data.priority||''),Number(data.cycle||30),'1'];
      if(pIndex>=0)participantSheet.getRange(pIndex+2,1,1,row.length).setValues([row]);
      else participantSheet.appendRow(row);
      // Idempotent latest-state upsert: one row per participant and dimension.
      const scores = data.scores && typeof data.scores==='object' ? data.scores : {};
      const done = data.done && typeof data.done==='object' ? data.done : {};
      for (let i=0;i<6;i++){
        const v=scores[String(i)];
        const score=Number(v);
        if(v!==undefined && Number.isInteger(score) && score>=0 && score<=10){
          const key=pseudo+'-'+(i+1);
          const row=[key,pseudo,now,i+1,MODULE_NAMES[i],score,locale,String(data.cycle||30)];
          const records=assessSheet.getLastRow()>1?assessSheet.getRange(2,1,assessSheet.getLastRow()-1,1).getValues().flat():[];
          const index=records.indexOf(key);
          if(index>=0)assessSheet.getRange(index+2,1,1,row.length).setValues([row]);
          else assessSheet.appendRow(row);
        }
        if(done[String(i)]===true){
          const key=pseudo+'-'+(i+1)+'-completed';
          const row=[key,pseudo,now,i+1,'experiment_completed',String(data.cycle||30)];
          const records=activitySheet.getLastRow()>1?activitySheet.getRange(2,1,activitySheet.getLastRow()-1,1).getValues().flat():[];
          const index=records.indexOf(key);
          if(index>=0)activitySheet.getRange(index+2,1,1,row.length).setValues([row]);
          else activitySheet.appendRow(row);
        }
      }
      const cRows=consentSheet.getLastRow()>1
        ? consentSheet.getRange(2,1,consentSheet.getLastRow()-1,1).getValues().flat():[];
      const cIndex=cRows.indexOf(pseudo);
      const cRow=[pseudo,cIndex>=0?consentSheet.getRange(cIndex+2,2).getValue():now,'1',true,''];
      if(cIndex>=0)consentSheet.getRange(cIndex+2,1,1,cRow.length).setValues([cRow]);
      else consentSheet.appendRow(cRow);
    } finally {lock.releaseLock();}
    return ContentService.createTextOutput(JSON.stringify({ok:true}));
  }catch(error){
    console.error('Rejected Build Yourself sync: '+error);
    return ContentService.createTextOutput(JSON.stringify({ok:false}));
  }
}
function hasId(sheet,id){
 const n=sheet.getLastRow();if(n<2)return false;
 return sheet.getRange(2,1,n-1,1).createTextFinder(id).matchEntireCell(true).findNext()!==null;
}
function setup(){
 const book=SpreadsheetApp.openById(SPREADSHEET_ID);
 if(!book.getSheetByName('Participants'))throw new Error('Sheet not found');
}
