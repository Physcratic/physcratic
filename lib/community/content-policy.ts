export const contentPolicy = {
 version:'community-text-v2',
 // Reviewed whole words, never substrings. These educational terms must stay valid.
 allowWords:new Set(['mass','class','classical','assumption','analysis','dielectric','passive','scattering','gaussian','fermion','boson','homogeneous']),
 trustedDomains:new Set(['physcratic.com','www.physcratic.com','arxiv.org','doi.org','en.wikipedia.org','physics.stackexchange.com']),
};
export type ContentDecision={state:'visible'|'held'|'blocked';codes:string[];policyVersion:string};
const blocked=new Set(['nigger','niggers','nigga','niggas','kike','kikes','faggot','faggots']);
const uncertain=new Set(['fuck','fucking','shit','bitch','asshole']);
const lookalikes:Record<string,string>={'а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','і':'i','ј':'j','0':'o','1':'i','3':'e','4':'a','5':'s','7':'t'};
export function policyTokens(text:string){return (text.normalize('NFKC').normalize('NFKD').replace(/\p{M}|\p{Cf}/gu,'').replace(/(?<=\p{L})[!|](?=\p{L})/gu,'i').replace(/(?<=\p{L})@(?=\p{L})/gu,'a').replace(/(?<=\p{L})\$(?=\p{L})/gu,'s').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).map(word=>[...word].map(c=>lookalikes[c]??c).join(''));}
export function evaluateComment(text:string,config=contentPolicy):ContentDecision {
 const tokens=policyTokens(text),phrase=tokens.join(' '),codes:string[]=[];
 if(tokens.some(t=>blocked.has(t)))return {state:'blocked',codes:['targeted-slur'],policyVersion:config.version};
 if(/(?:^| )(?:kill yourself|go kill yourself|i will kill you|i will hurt you|you should die)(?: |$)/.test(phrase))return {state:'blocked',codes:['direct-threat'],policyVersion:config.version};
 if(tokens.some(t=>uncertain.has(t)&&!config.allowWords.has(t)))codes.push('language-review');
 for(let i=0;i<tokens.length;i++){let joined='';for(let j=i;j<Math.min(i+8,tokens.length);j++){joined+=tokens[j];if(joined.length>12)break;if(j>i&&(blocked.has(joined)||uncertain.has(joined))){codes.push('obfuscated-language');break;}}}
 const clean=text.normalize('NFKC').replace(/\p{Cf}/gu,'');
 if(/(?:javascript|vbscript)\s*:|data\s*:(?:text\/|application\/|image\/|[^\s,]*;base64,)/i.test(clean))codes.push('unsafe-link-review');
 const links=clean.match(/(?:https?:\/\/|www\.)[^\s<>]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|xyz|ru|info|io)\b/gi)??[];
 if(links.length>2)codes.push('link-volume');
 for(const link of links){try{const url=new URL(/^https?:\/\//i.test(link)?link:'https://'+link);if(!config.trustedDomains.has(url.hostname.toLowerCase())||url.username||url.password)codes.push('link-review');}catch{codes.push('link-review');}}
 if(tokens.length>32&&new Set(tokens).size/tokens.length<0.15)codes.push('repetition-review');
 if(/(\p{L})\1{24,}/u.test(clean))codes.push('repetition-review');
 return {state:codes.length?'held':'visible',codes:[...new Set(codes)].slice(0,10),policyVersion:config.version};
}
