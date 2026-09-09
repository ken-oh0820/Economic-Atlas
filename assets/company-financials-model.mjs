// Calculations on user-entered figures only. No provider access or storage.
export function compare(current,previous){
  if(typeof current!=='number'||!Number.isFinite(current)||typeof previous!=='number'||!Number.isFinite(previous))return {text:'과거 데이터 없음',tone:'muted'};
  const delta=current-previous;
  if(previous===0)return {text:current===0?'변동 없음':'비교 기준 0',tone:'muted'};
  if(previous<0&&current>=0)return {text:current>0?'흑자 전환':'손익분기',tone:'up'};
  if(previous>0&&current<0)return {text:'적자 전환',tone:'down'};
  if(previous<0)return {text:delta>0?'적자 축소':delta<0?'적자 확대':'변동 없음',tone:delta>0?'up':delta<0?'down':'muted'};
  const percent=delta/previous*100;
  return {text:(percent>0?'+':'')+percent.toFixed(2)+'%',tone:percent>0?'up':percent<0?'down':'muted'};
}
