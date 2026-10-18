/* Prompt Builder V1.1 — deterministic, browser/Node compatible intelligence engine.
 * No credentials, network requests, or privileged access here. */
export const MODES = ['text','image','video','image2video'];
export const TASKS = ['Research','Writing','Marketing','Analysis','Coding','AI Agent'];
export const FIELD_OPTIONS = {
 text: {
  task: TASKS, audience:['General public','Beginners','Professionals','Customers','Management','Students'],
  format:['AI recommends','Bullet points','Step-by-step guide','Comparison table','Email','Social media post','Detailed report','JSON','Working code'],
  tone:['AI recommends','Professional and friendly','Short and direct','Creative and engaging','Educational and simple','Formal','Persuasive'],
  depth:['Efficient','Balanced','Detailed']
 },
 image: {
  purpose:['AI recommends','Social media post','Property marketing','Product advertisement','Portrait','Poster / flyer','Presentation','Personal artwork'],
  style:['AI recommends','Photorealistic','Cinematic','Luxury editorial','3D render','Anime illustration','Minimalist','Watercolour'],
  composition:['AI recommends','Close-up portrait','Eye-level wide shot','Bird’s-eye view','Rule of thirds','Centered subject','Product hero shot'],
  lighting:['AI recommends','Soft natural daylight','Golden-hour glow','Studio softbox','Dramatic cinematic','Bright and clean','Neon nightlife'],
  ratio:['AI recommends','1:1','4:5','9:16','16:9','3:2']
 },
 video: {
  purpose:['AI recommends','TikTok / Reels','YouTube','Product advertisement','Property showcase','Storytelling','Education'],
  style:['AI recommends','Photorealistic cinematic','Documentary','Luxury commercial','3D animation','Anime','Playful social'],
  motion:['AI recommends','Slow natural motion','Walking forward','Object rotates','Wind or fabric movement','Dynamic action'],
  camera:['AI recommends','Static tripod','Slow push-in','Pan left to right','Orbit around subject','Tracking shot','Handheld documentary'],
  duration:['AI recommends','5 seconds','8 seconds','10 seconds','15 seconds'],
  ratio:['AI recommends','9:16','16:9','1:1','4:5']
 },
 image2video: {
  purpose:['AI recommends','TikTok / Reels','Property showcase','Product advertisement','Portrait animation','Cinematic reveal'],
  style:['Match reference image','Photorealistic cinematic','Subtle cinematic','Dreamy','Luxury commercial'],
  motion:['Subtle natural movement','Slow zoom in','Pan left to right','Slow dolly forward','Subject walks forward','Curtains / trees sway','Product rotates'],
  camera:['AI recommends','Locked camera','Slow push-in','Pan left to right','Slow orbit','Tracking shot'],
  duration:['AI recommends','5 seconds','8 seconds','10 seconds','15 seconds'],
  ratio:['Match reference / AI recommends','9:16','16:9','1:1','4:5']
 }
};
for (const key of MODES) FIELD_OPTIONS[key].language = ['English','简体中文 (Simplified Chinese)'];
export const EMPTY = {mode:'text',task:'Research',goal:'',rootProblem:'',audience:'',facts:'',constraints:'',success:'',format:'AI recommends',tone:'AI recommends',depth:'Balanced',purpose:'AI recommends',style:'AI recommends',composition:'AI recommends',lighting:'AI recommends',ratio:'AI recommends',motion:'AI recommends',camera:'AI recommends',duration:'AI recommends',audio:'AI recommends',exclusions:'',referenceNotes:'',overlay:'', language:'English',imageName:''};
export const EXAMPLES = [
 {title:'Property launch post',mode:'text',task:'Marketing',goal:'Create a Facebook post that attracts qualified enquiries for an upcoming condominium launch.',rootProblem:'I need genuinely interested buyers, not generic views.',audience:'Singapore homebuyers',facts:'Project details and verified pricing will be supplied separately.',constraints:'Do not invent launch dates, prices or investment returns.',format:'Social media post'},
 {title:'Marketing image',mode:'image',goal:'A modern condominium living room with floor-to-ceiling windows opening to a green balcony.',purpose:'Property marketing',style:'Photorealistic',composition:'Eye-level wide shot',lighting:'Soft natural daylight',ratio:'4:5',exclusions:'No warped walls or invented project branding.'},
 {title:'Cinematic property video',mode:'video',goal:'Show a modern living room opening toward a landscaped balcony.',purpose:'Property showcase',style:'Photorealistic cinematic',motion:'Slow natural motion',camera:'Slow push-in',duration:'8 seconds',ratio:'9:16'},
 {title:'Animate a reference image',mode:'image2video',goal:'Animate a still property interior photo while preserving its original layout.',purpose:'Property showcase',style:'Match reference image',motion:'Slow dolly forward',camera:'Slow push-in',duration:'8 seconds',ratio:'9:16',referenceNotes:'Preserve the furniture layout and architectural geometry from the supplied image.'}
];
const str = v => (v == null ? '' : String(v)).trim();
const set = v => !!str(v) && !/^(AI recommends|Match reference \/ AI recommends)$/i.test(str(v));
const normalize = s => str(s).replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n');
const neutral = (v,fallback) => set(v) ? str(v) : fallback;
export function suggestMode(goal){
 const g=str(goal).toLowerCase();
 if(/(?:image|photo|picture|still).{0,32}(?:to|into|as)\s+(?:a\s+)?video|animate (?:this|a|my|an|the|photo|image)|moving photo/.test(g))return 'image2video';
 if(/video|reel|film|clip|animation|cinematic sequence|storyboard/.test(g))return 'video';
 if(/image|picture|photograph|flyer|poster|illustration|render|portrait/.test(g))return 'image';
 return 'text';
}
export function suggestTask(goal){const g=str(goal).toLowerCase();if(/code|debug|website|app|software|api|deploy|crm|dashboard|build a system/.test(g))return 'Coding';if(/agent|automation|workflow/.test(g))return 'AI Agent';if(/compare|analyse|analyze|risk|quotation|data/.test(g))return 'Analysis';if(/market|advertis|facebook|tiktok|social|leads|campaign/.test(g))return 'Marketing';if(/write|email|letter|blog|rewrite|caption/.test(g))return 'Writing';return 'Research'}
export function suggestDefaults(s){
 const v={...s};
 const isVid=v.mode==='video'||v.mode==='image2video';
 if(v.mode==='text'){
  if(!set(v.format))v.format = /comparison|compare|quotation|evaluate/i.test(v.goal)?'Comparison table':/email/i.test(v.goal)?'Email':/facebook|social|tiktok|caption|marketing post/i.test(v.goal)?'Social media post':/app|code|debug/i.test(v.goal)?'Working code':'Step-by-step guide';
  if(!set(v.tone))v.tone='Professional and friendly';
 } else {
  if(!set(v.purpose))v.purpose = /property|condo|home|real estate/i.test(v.goal)?'Property showcase':/tiktok|reel/i.test(v.goal)?'TikTok / Reels':v.mode==='image'?'Social media post':'Product advertisement';
  if(!set(v.style))v.style = v.mode==='image2video'?'Match reference image':'Photorealistic cinematic';
  if(!set(v.ratio))v.ratio=/tiktok|reel|story/i.test(v.goal)?'9:16':v.mode==='image'?'4:5':'16:9';
  if(v.mode==='image'){
   if(!set(v.composition))v.composition='Eye-level wide shot';
   if(!set(v.lighting))v.lighting='Soft natural daylight';
  }
  if(isVid){if(!set(v.motion))v.motion=v.mode==='image2video'?'Subtle natural movement':'Slow natural motion';if(!set(v.camera))v.camera='Slow push-in';if(!set(v.duration))v.duration='8 seconds';}
 }
 return v;
}
function containsEither(s,a,b){const lower=str(s).toLowerCase();return lower.includes(a)&&lower.includes(b)}
export function diagnose(s){
 const issues=[];let questions=[];const g=str(s.goal);const textMode=s.mode==='text';const visual=s.mode!=='text';
 const issue=(severity,label,advice,field,autofix='')=>issues.push({severity,label,advice,field,autofix});
 if(!g)issue('critical','Main idea missing','Describe what you want the AI to create.','goal');
 else if(g.length<22)issue('warning','Objective is very short','Say who, what and why in one sentence.','goal');
 if(textMode){
  if(!str(s.rootProblem))issue(s.task==='Coding'||s.task==='AI Agent'?'critical':'warning','Problem behind the request is unclear','What problem are you trying to solve?','rootProblem');
  if(!str(s.audience))issue('warning','Audience not defined','Choose who will use the result.','audience');
  if(!str(s.success))issue('warning','Success is not measurable','Describe what a useful result must include.','success');
  if(!str(s.facts)&&/research|analysis|coding|ai agent/i.test(s.task))issue('warning','Background information is missing','List facts, files or existing systems the AI should use.','facts');
  if(!str(s.constraints))issue('warning','Missing guardrails','Avoid invented facts and identify unknowns.','constraints','Clearly mark assumptions and missing information; never invent facts.');
  if(!set(s.format))issue('info','Output format not chosen','Let Smart Fill select a clear response format.','format');
  if(s.task==='Coding' && !/test|validat|accept|pass/i.test(str(s.success)+str(s.constraints)))issue('critical','No test or acceptance checks','Define test cases before writing software.','success','Include runnable tests, error states and setup verification.');
  if(s.task==='AI Agent'&&!/human|approv|escalat|handoff/i.test(str(s.constraints)))issue('critical','No human handoff rule','Define when the agent must stop and ask for approval.','constraints','Escalate uncertain, sensitive and irreversible decisions for human approval.');
  questions=[!s.rootProblem?'What is not working well today?':null,!s.audience?'Who will use the result?':null,!s.success?'How will you know the result is successful?':null].filter(Boolean);
 }else{
  if(!set(s.purpose))issue('warning','Intended use missing','Choose where the finished media will be used.','purpose');
  if(!set(s.ratio))issue('warning','Aspect ratio not selected','Choose vertical, square or landscape.','ratio');
  if(s.mode==='image' && !set(s.composition))issue('warning','Camera framing is unclear','Choose a framing preset.','composition');
  if(s.mode==='image' && !set(s.lighting))issue('info','Lighting is unspecified','Select a natural or stylised lighting preset.','lighting');
  if(s.mode!=='image' && !set(s.motion))issue('critical','Movement is missing','Explain how the subject or scene changes.','motion');
  if(s.mode!=='image' && !set(s.duration))issue('warning','Duration not set','Select a reasonable clip length.','duration');
  if(s.mode==='image2video' && !str(s.imageName))issue('critical','Reference image not attached','Add a reference image to preview locally, then upload it to your generation tool.','imageName');
  if(s.mode==='image2video' && !str(s.referenceNotes))issue('warning','Preservation rules unspecified','Describe what must stay identical to the image.','referenceNotes','Preserve subject identity, geometry, appearance and composition of the supplied image.');
  questions=[!set(s.purpose)?'Where will people watch or see this?':null,!set(s.ratio)?'Portrait or landscape?':null,s.mode==='image2video'&&!s.imageName?'Which original image should be animated?':null].filter(Boolean);
 }
 if(containsEither(s.goal+' '+s.constraints,'vertical','horizontal'))issue('warning','Possible framing conflict','Both vertical and horizontal are mentioned. Choose a single final orientation.','ratio');
 if(containsEither(s.constraints+' '+s.exclusions,'include text','no text'))issue('warning','Possible text conflict','Both include and exclude text appear. Clarify the wording.','exclusions');
 const critical=issues.filter(i=>i.severity==='critical').length;
 return {issues,questions,critical,ready:critical===0,summary:critical?`${critical} critical gap${critical===1?'':'s'} to resolve`:issues.length?'Usable draft · improvement tips available':'Strong brief · ready to use'};
}
export function autoRepair(s){let out={...s};out=suggestDefaults(out);for(const i of diagnose(out).issues){if(i.autofix && !str(out[i.field]))out[i.field]=i.autofix;}return out;}
function uniqueLines(lines){const seen=new Set();return lines.map(x=>normalize(x)).filter(x=>{if(!x)return false;const key=x.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});}
export function buildPrompt(s,depth=s.depth||'Balanced'){
 const d=String(depth).toLowerCase();const compact=d==='efficient';const detailed=d==='detailed';const lines=[];
 const add=(k,value)=>{if(set(value))lines.push(`${k}: ${normalize(value)}`)};
 if(!str(s.goal))return '';
 if(s.mode==='text'){
  add('TASK',s.goal);add('REAL PROBLEM TO SOLVE',s.rootProblem);add('FOR',s.audience);add('KNOWN CONTEXT',s.facts);
  add('REQUIREMENTS & RULES',s.constraints);
  add('OUTPUT',neutral(s.format,'A clear, practical answer'));add('TONE',s.tone);
  add('SUCCESS CHECK',s.success);
  if(s.task==='Coding')lines.push('Before implementing: confirm architecture, assumptions, acceptance tests and unresolved decisions. Do not invent missing requirements.');
  else if(s.task==='AI Agent')lines.push('Specify triggers, tools, permissions, failure handling and human approval gates.');
  else if(!compact)lines.push('Separate verified facts from assumptions; identify missing information instead of guessing.');
 }else{
  add('CREATE',s.goal);add('INTENDED OUTCOME',s.rootProblem);add('USE',s.purpose);add('LOOK',s.style);
  if(s.mode==='image'){
   add('FRAMING',s.composition);add('LIGHTING',s.lighting);
  }else{
   add('VISIBLE ACTION',s.motion);add('CAMERA',s.camera);add('LENGTH',s.duration);
   if(s.mode==='image2video'){
    lines.push('START FRAME: Use the separately supplied reference image as the opening visual.');
    add('MUST STAY UNCHANGED',s.referenceNotes||'Preserve the original subject identity, composition and scene geometry.');
   }
   add('AUDIO',s.audio);
   if(!compact)lines.push('Maintain consistent identity, natural motion and stable geometry between frames.');
  }
  add('ASPECT',s.ratio);add('ON-SCREEN WORDS',s.overlay);add('AVOID',s.exclusions);
  if(s.mode==='image')lines.push('Generate the image only; verify readable typography and spatial consistency.');
  else lines.push('Avoid frame flicker, morphing and abrupt unintended transitions.');
 }
 add('OUTPUT LANGUAGE',s.language);
 if(detailed)lines.push('FINAL CHECK: Validate every stated constraint and report any unsupported parameters or missing references before proceeding.');
 if(compact)return uniqueLines(lines).join('\n').replace(/^(TASK|CREATE): /m,'');
 return uniqueLines(lines).join('\n\n');
}
export function optimize(s){const normal=buildPrompt(s,'Detailed'),efficient=buildPrompt(s,'Efficient'),chosen=buildPrompt(s,s.depth);const estimate=x=>Math.max(0,Math.ceil(x.length/4));const originalTokens=estimate(normal),efficientTokens=estimate(efficient);return {prompt:chosen,baseline:normal,efficient,estimatedTokens:estimate(chosen),baselineTokens:originalTokens,efficientTokens,reduction:originalTokens?Math.round((1-efficientTokens/originalTokens)*100):0,note:'Estimated tokens only (character-based). Compare actual API usage for exact counts.'};}
export function briefing(s){const d=diagnose(s);return {objective:str(s.goal),rootProblem:str(s.rootProblem)||'Not supplied — clarify before complex implementation.',assumptions:'No unstated facts assumed.',keyQuestions:d.questions,risks:d.issues.filter(i=>i.severity==='critical'||i.severity==='warning').map(i=>i.label),definitionOfDone:str(s.success)||'Not yet specified.'};}
