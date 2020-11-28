window._curVideoInfo = null;
const ORIGINAL_DOC_TITLE = document.title;
var showVideoInfo = function(data, base) {
  document.querySelector('#video-info').style.display = 'block';
  var imgTag = base.querySelector('.video-img');
  fetch(data.pic.substr(data.pic.indexOf('//')) + '@300w_300h.webp', {
    referrerPolicy: "no-referrer"
  }).then(r=>r.blob()).then(b=>imgTag.src = URL.createObjectURL(b));
  base.querySelector('.video-title').textContent = data.title;
  base.querySelector('.video-description').textContent = data.description;
  let infoForm = base.querySelector('form.video-info');
  infoForm.avid.value = data.aid;
  infoForm.bvid.value = data.bvid;
  infoForm.cid.value = data.cid;
  infoForm.subtitle.innerHTML = '';
  infoForm.subtitle.appendChild(new Option('None', ''));
  if(data._player && data._player.subtitle && data._player.subtitle.subtitles) {
    let urlMap = {};
    data._player.subtitle.subtitles.forEach(subtitle => {
      let opt = new Option(subtitle.lan_doc, subtitle.subtitle_url);
      opt._meta = subtitle;
      infoForm.subtitle.appendChild(opt);
      urlMap[subtitle.lan] = subtitle.subtitle_url;
    });
    
    infoForm.subtitle.value = urlMap['zh-Hans'] || urlMap['zh-Hant'] || '';
  }
  document.title = data.title + ' | ' + ORIGINAL_DOC_TITLE;
  let paramAid = new URLSearchParams(location.search).get('aid');
  let videoId = data.bvid || ('av' + data.aid);
  if(typeof paramAid!=='string' || !paramAid.includes(videoId))
    history.pushState({
      aid: videoId
    }, document.title, "?aid=" + videoId);
};

var parseAidFromStr = (str) => {
    let m = str.match(/(av\d+|BV[a-zA-Z0-9]+)/i);
    if(m && m.length>1) return m[1];
    return null;
};

var gotFile = function(name, content) {
  var danmaku = parseFile(content);
  var ass = generateASS(setPosition(danmaku), {
    'title': document.title,
    'ori': name,
  });
  startDownload('\ufeff' + ass, name.replace(/\.[^.]*$/, '') + '.ass');
};

window.addEventListener('load', function() {
  var fetchVideoInfo = function(aid) {
    aid = parseAidFromStr(aid);
    let base = document.querySelector('.in');
    window._curVideoInfo = { aid };
    document.querySelector('#video-info').style.display = 'none';
    let videoLink = 'https://www.bilibili.com/video/' + aid;
    base.querySelector('.video-title').href = base.querySelector('.video-img-container').href = videoLink;

    // This api require modified header
    return fetch('https://api.bilibili.com/x/article/cards?ids='+encodeURIComponent(aid)+'&cross_domain=true')
        .then(r=>r.json())
        .then(z=>z.data[aid])
        .then(d => {
            let playerInfo = fetch('https://api.bilibili.com/x/player/v2?cid=' + d.cid + '&bvid=' + d.bvid, {
            }).then(r=>r.json()).then(playerInfo => {
                Object.assign(window._curVideoInfo, d);
                window._curVideoInfo._player = playerInfo.code === 0 ? playerInfo.data : null;
                showVideoInfo(window._curVideoInfo, base);
                return window._curVideoInfo;
            });
            
            return playerInfo;
        });
  };

  var sideForm = document.querySelector('#side-buttons');
  sideForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var aid = parseAidFromStr(this['aid'].value);
    new Promise(a=>{
      if (window._curVideoInfo && _curVideoInfo.aid === aid) {
        return a(_curVideoInfo);
      } else {
        return fetchVideoInfo(aid).then(a);
      }
    }).then(data=>{
      return fetch('https://comment.bilibili.com/' + data.cid + '.xml', {
        referrerPolicy: "no-referrer"
      }).then(r=>r.text()).then(xml=>{
        gotFile(_curVideoInfo.title, xml);
      })
    });
  });
  
  var dlSubtitleBtn = document.querySelector('#convertSubtitleBtn');
  dlSubtitleBtn.addEventListener('click', function(e) {
     e.preventDefault();
     let opt = this.form.subtitle.selectedOptions[0];
     let url = opt.value;
     if (!url) return;
     fetch(url, {
       referrerPolicy: "no-referrer",
     }).then(r=>r.json()).then(d=>{
       let data = d.body.map(line => {
         return {
           color: "FFFFFF",
           bottom: false,
           dtime: line.to,
           mode: "SRT",
           stime: line.from,
           text: line.content,
           time: line.from,
           type: "SRT",
           loc: line.location,
           size: 25,
         }
       });
       var ass = generateASS(data, {
         'title': document.title,
         'ori': name,
       });
      startDownload('\ufeff' + ass, _curVideoInfo.title.replace(/\.[^.]*$/, '') + '.' + opt._meta.lan + '.ass');
     });
  });

  if (window.URLSearchParams) {
    var urlAid = new URLSearchParams(location.search).get('aid');
    if (urlAid) {
      sideForm['aid'].value = urlAid;
      fetchVideoInfo(urlAid);
    }
  }
  
  window.onpopstate=function(){
    let stateAid = history.state.aid;
    if(stateAid) {
      sideForm['aid'].value = stateAid;
      fetchVideoInfo(stateAid);
    }
  };
});
