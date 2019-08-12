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
  document.title = data.title + ' | ' + ORIGINAL_DOC_TITLE;
  
  let paramAid = new URLSearchParams(location.search).get('aid');
  if(typeof paramAid!=='string' || paramAid.includes(''+data.aid))
    history.pushState({}, document.title, "?aid=av" + data.aid);
};

var parseAidFromStr = (str) => {
    if(str.match(/^\d+$/)) str = 'av' + str;
    let m = str.match(/(av\d+)/i);
    if(m && m.length>1) return m[1].substr(2);
    return null;
};

var gotFile = function(name, content) {
  var danmaku = parseFile(content);
  var ass = generateASS(setPosition(danmaku), {
    'title': document.title,
    'ori': name,
    'alpha': 1,
  });
  startDownload('\ufeff' + ass, name.replace(/\.[^.]*$/, '') + '.ass');
};

window.addEventListener('load', function() {
  var fetchVideoInfo = function(aid) {
    aid = parseAidFromStr(aid);
    let base = document.querySelector('.in');
    window._curVideoInfo = { aid };
    document.querySelector('#video-info').style.display = 'none';
    base.querySelector('.video-title').href = base.querySelector('.video-img-container').href = 'https://www.bilibili.com/video/av' + aid;

    // This api require modified header
    return fetch('https://api.bilibili.com/x/article/archives?ids='+encodeURIComponent(aid)+'&cross_domain=true')
        .then(r=>r.json())
        .then(z=>z.data[aid])
        .then(d => {
            d.aid = d.aid.toString();
            Object.assign(window._curVideoInfo, d);
            showVideoInfo(window._curVideoInfo, base);
            return window._curVideoInfo;
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

  if (window.URLSearchParams) {
    var urlAid = new URLSearchParams(location.search).get('aid');
    if (urlAid) {
      sideForm['aid'].value = urlAid;
      fetchVideoInfo(urlAid);
    }
  }
});
