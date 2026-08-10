(() => {
  'use strict';

  window.RBTwarV13Patch = (corrected, replaceOne) => {
    const selectSquad = `function selectSquad(s){
 game.squads.forEach(x=>x.selected=false);s.selected=true;selectedSquadId=s.id;
 ui.selectedSquadLabel.textContent=UNITS[s.type].short+' · '+s.count;
 ui.selectedSquadType.textContent='Nv.'+s.level;
 ui.selectionPanel.classList.remove('hidden');
}`;
    corrected = replaceOne(
      corrected,
      /function selectSquad\(s\)\{[\s\S]*?\}\nfunction deselect/,
      `${selectSquad}\nfunction deselect`,
      'panel de selección compacto'
    );

    const drawBadge = `function drawBadge(n,s){
 if(n.team===TEAM.NEUTRAL||n.hp<=0)return;
 const y=n.y+(n.kind==='hq'?54:44)*s,w=Math.min(5,waitingCount(n)),sec=nextSpawn(n),interval=n.spawnQueue>0?game.config.initialSpawnInterval:productionInterval(n),prog=sec==null?0:clamp(1-sec/Math.max(.01,interval),0,1);
 const bw=76*s,bh=23*s;
 ctx.save();ctx.fillStyle='rgba(4,12,20,.90)';ctx.beginPath();ctx.roundRect(n.x-bw/2,y,bw,bh,9*s);ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=1*s;ctx.stroke();
 ctx.fillStyle='#f3f8fc';ctx.font=\`900 \${9.5*s}px system-ui\`;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(UNITS[n.unitType].short+' '+w+'/5',n.x-bw/2+8*s,y+bh/2);
 ctx.textAlign='right';ctx.fillStyle=TEAM_COLOR[n.team];ctx.font=\`900 \${9*s}px system-ui\`;ctx.fillText(sec==null?'':Math.ceil(sec)+'s',n.x+bw/2-7*s,y+bh/2);
 ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=3*s;ctx.beginPath();ctx.arc(n.x+8*s,y+bh/2,6*s,-Math.PI/2,Math.PI*1.5);ctx.stroke();
 ctx.strokeStyle=TEAM_COLOR[n.team];ctx.beginPath();ctx.arc(n.x+8*s,y+bh/2,6*s,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);ctx.stroke();ctx.restore();
}`;
    corrected = replaceOne(
      corrected,
      /function drawBadge\(n,s\)\{[\s\S]*?\}\nfunction drawBases/,
      `${drawBadge}\nfunction drawBases`,
      'contador de fábrica legible'
    );

    corrected = corrected
      .replace("ctx.font=`900 ${8.5*s}px system-ui`;ctx.textAlign='center';ctx.fillText('CORE'", "ctx.font=`900 ${10.5*s}px system-ui`;ctx.textAlign='center';ctx.fillText('CORE'")
      .replace("ctx.font=`900 ${8.5*s}px system-ui`;ctx.textAlign='center';ctx.fillText(label", "ctx.font=`900 ${10*s}px system-ui`;ctx.textAlign='center';ctx.fillText(label");

    corrected = corrected.replace(
      "const unlocked=unlockedTypes(game.level).map(t=>UNITS[t].name).join(', ');showToast(`Unidades disponibles: ${unlocked}. Arrastra para mover.`);",
      "showToast('Arrastra tus pelotones para moverlos.');"
    );

    return corrected;
  };
})();
