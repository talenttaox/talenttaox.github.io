(() => {
  const panel=document.querySelector('.lecture-search'),article=document.querySelector('.prose');
  if(!panel||!article)return;
  const zh=document.body.dataset.lang==='zh';
  const input=panel.querySelector('#lecture-query'),status=panel.querySelector('output');
  const results=panel.querySelector('#lecture-results'),list=panel.querySelector('.lecture-result-list');
  const prev=panel.querySelector('#lecture-prev'),next=panel.querySelector('#lecture-next'),more=panel.querySelector('#lecture-more');
  let matches=[],current=-1,shown=0,timer,lastQuery='';
  // Index rendered text, so a phrase can span bold text and inline links.
  let chapter='',section='';
  const blocks=[];
  article.querySelectorAll('h2,h3,h4,p,li,th,td').forEach(element=>{
    if(element.matches('h2')){chapter=element.textContent;section='';}
    if(element.matches('h3,h4'))section=element.textContent;
    if(element.closest('.article-download,.language-notice')||element.querySelector('p,li,table'))return;
    if(!element.id)element.id=`lecture-block-${blocks.length}`;
    blocks.push({element,text:element.textContent,chapter,section});
  });
  function clearHighlights(){
    article.querySelectorAll('mark.lecture-hit').forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent)));
    blocks.forEach(block=>block.element.normalize());
  }
  function highlight(block,hits){
    const walker=document.createTreeWalker(block.element,NodeFilter.SHOW_TEXT),nodes=[];
    let node,offset=0;
    while((node=walker.nextNode())){nodes.push({node,start:offset,end:offset+node.length});offset+=node.length;}
    for(const part of nodes){
      const overlaps=hits.filter(hit=>hit.start<part.end&&hit.end>part.start);
      if(!overlaps.length)continue;
      const fragment=document.createDocumentFragment();let cursor=0;
      for(const hit of overlaps){
        const start=Math.max(0,hit.start-part.start),end=Math.min(part.node.length,hit.end-part.start);
        fragment.append(document.createTextNode(part.node.data.slice(cursor,start)));
        const mark=document.createElement('mark');mark.className='lecture-hit';mark.dataset.match=hit.index;
        mark.textContent=part.node.data.slice(start,end);fragment.append(mark);cursor=end;
      }
      fragment.append(document.createTextNode(part.node.data.slice(cursor)));part.node.replaceWith(fragment);
    }
  }
  function updateStatus(){
    if(!lastQuery)status.textContent=zh?'搜索全部章节':'Search all chapters';
    else if(!matches.length)status.textContent=zh?'没有找到匹配的关键词':'No matching text found';
    else status.textContent=current<0?(zh?`找到 ${matches.length} 处匹配`:`${matches.length} matches`):(zh?`第 ${current+1} / ${matches.length} 处匹配`:`Match ${current+1} of ${matches.length}`);
  }
  function jump(index){
    if(!matches.length)return;
    current=(index+matches.length)%matches.length;
    article.querySelectorAll('mark.current').forEach(mark=>mark.classList.remove('current'));
    const marks=article.querySelectorAll(`mark[data-match="${current}"]`);
    marks.forEach(mark=>mark.classList.add('current'));
    list.querySelectorAll('button').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.match)===current)));
    const target=marks[0]||matches[current].block.element;
    const toc=document.querySelector('.toc-panel');if(matchMedia('(max-width:760px)').matches&&toc)toc.open=false;
    history.replaceState(null,'',`#${matches[current].block.element.id}`);
    target.tabIndex=-1;target.focus({preventScroll:true});
    target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
    updateStatus();
  }
  function showMore(){
    const end=Math.min(matches.length,shown+40);
    for(let i=shown;i<end;i++){
      const hit=matches[i],button=document.createElement('button');button.type='button';button.className='lecture-result';button.dataset.match=i;
      const heading=document.createElement('strong');heading.textContent=[hit.block.chapter,hit.block.section].filter(Boolean).join(' / ');
      const snippet=document.createElement('span'),from=Math.max(0,hit.start-32),to=Math.min(hit.block.text.length,hit.end+48);
      snippet.append(document.createTextNode((from?'…':'')+hit.block.text.slice(from,hit.start)));
      const mark=document.createElement('mark');mark.textContent=hit.block.text.slice(hit.start,hit.end);snippet.append(mark);
      snippet.append(document.createTextNode(hit.block.text.slice(hit.end,to)+(to<hit.block.text.length?'…':'')));
      button.append(heading,snippet);button.addEventListener('click',()=>jump(i));list.append(button);
    }
    shown=end;more.hidden=shown>=matches.length;
  }
  function search(){
    clearTimeout(timer);
    const query=input.value.trim();if(query===lastQuery)return;
    lastQuery=query;clearHighlights();matches=[];current=-1;shown=0;list.replaceChildren();
    if(query){
      const expression=new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');
      for(const block of blocks){
        const hits=[];
        for(const match of block.text.matchAll(expression)){
          const hit={block,start:match.index,end:match.index+match[0].length,index:matches.length};hits.push(hit);matches.push(hit);
        }
        if(hits.length)highlight(block,hits);
      }
    }
    results.hidden=!matches.length;prev.disabled=next.disabled=!matches.length;more.hidden=true;
    showMore();updateStatus();
  }
  panel.hidden=false;
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,160);});
  input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value='';search();}});
  panel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();search();jump(current+1);});
  panel.querySelector('#lecture-clear').addEventListener('click',()=>{input.value='';search();input.focus();});
  prev.addEventListener('click',()=>{search();jump(current<0?matches.length-1:current-1);});
  next.addEventListener('click',()=>{search();jump(current+1);});
  more.addEventListener('click',showMore);
})();
