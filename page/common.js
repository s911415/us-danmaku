window._curVideoInfo = null;
window.onVideoInfoRec = function(data) {
  _curVideoInfo = Object.assign(_curVideoInfo, data);
  showVideoInfo(data);
};

var showVideoInfo = function(data) {
  document.querySelector('#video-info').style.display = 'block';
  var imgTag = document.querySelector('#video-img');
  fetch(data.pic + '@300w_300h.webp', {
    referrerPolicy: "no-referrer"
  }).then(r=>r.blob()).then(b=>imgTag.src = URL.createObjectURL(b));
  document.querySelector('#video-title').textContent = data.title;
  document.querySelector('#video-description').textContent = data.description;
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
    aid = aid.replace(/^av/i, "")
    window._curVideoInfo = { aid };
    return new Promise((a,b)=>{
      var script = document.createElement('script');
      script.src = "https://api.bilibili.com/view?type=jsonp&appkey=8e9fc618fbd41e28&type=jsonp&callback=onVideoInfoRec&id=" + aid + '&_=' + Math.random();
      script.addEventListener('load', function() {
        this.parentNode.removeChild(this);
        a(_curVideoInfo);
      });
      script.addEventListener('error', e=>b(e));
      script.addEventListener('abort', e=>b(e));
      document.body.appendChild(script);
      document.querySelector('#video-info').style.display = 'none';
      document.querySelector('#video-title').href = document.querySelector('#video-img-container').href = 'https://www.bilibili.com/video/av' + aid;
    });
  };

  var sideForm = document.querySelector('#side-buttons');
  sideForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var aid = this['aid'].value.replace(/^av/i, "");
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
