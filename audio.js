/* CONST */
const SMOOTHING = 0.5;
const FFT_SIZE = 2048;

/* canvas setup */
const c = document.getElementById('canvas');
cw = window.innerWidth;
ch = window.innerHeight * (1/4);
c.width = cw;
c.height = ch;
const ctx = c.getContext('2d');

/* audio setup */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * 音声ファイルローダー
 * @param {string} url 読み込む音声データのURL
 * @param {Function} callback 読み込み完了後に実行されるコールバック
 */
class Loader {
  constructor(url, callback) {
    this.url = url;
    this.onLoad = callback;
  }

  loadBuffer() {
    const request = new XMLHttpRequest();
    request.open('GET', this.url, true);
    request.responseType = 'arraybuffer';

    request.onload = res => {
      audioCtx.decodeAudioData(
        res.currentTarget.response,
        buffer => {
          if (!buffer) {
            console.log('error');
            return;
          }
          this.onLoad(buffer);
        },
        error => {
          console.log('decodeAudioData error');
        }
      );
    };

    request.onerror = () => {
      console.log('Loader: XHR error');
    };

    request.send();
  }
}

/**
 * ビジュアライザー
 * @constructor
 */
class Visualizer {
  constructor(buffer) {
    this.numBars = 128;
    this.analyser = audioCtx.createAnalyser();
    this.analyser.connect(audioCtx.destination);
    this.analyser.minDecibels = -140;
    this.analyser.maxDecibels = 0;
    this.freqs = new Uint8Array(this.analyser.frequencyBinCount);
    this.times = new Uint8Array(this.analyser.frequencyBinCount);
    this.source = audioCtx.createBufferSource();
    this.source.connect(this.analyser);
    this.source.buffer = buffer;
    this.source.loop = true;
  }

  play() {
    this.source.start(0);
    this.draw();
  }

  draw() {
    cw = window.innerWidth;
    ch = window.innerHeight * (1/4);
    c.width = cw;
    c.height = ch;

    this.analyser.smoothingTimeConstant = SMOOTHING;
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.getByteFrequencyData(this.freqs);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(27, 27, 27, 1)';//'rgba(255, 0, 55, 1)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';

    for (let index = 0; index < this.numBars; index += 1) {
      this.drawAS(index);
    }

    // for (let index = 0; index < this.analyser.frequencyBinCount; index += 1) {
    //   this.drawBottom(index);
    // }

    window.requestAnimationFrame(this.draw.bind(this));
  }

  drawAS(index) {
    if (!('old_height' in this.drawAS)) {
        // もし、プロパティ"a"が未定義であれば、
        // 初期値の0を代入する
        this.drawAS.old_height = new Array(this.freqs.length).fill(2);
    }
    const spacerper = 1.1
    const barWidth = cw / 128 / spacerper;
    const spacerWidth = barWidth * spacerper;
    var height = this.freqs[index] - 160;
    height = 0.3 * height + 0.7 * this.drawAS.old_height[index];
    this.drawAS.old_height[index] = height;
    // const hue = (index / 128) * 360;
    // ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';

    if (height > 0) {
      // ctx.fillRect(index * spacerWidth, ch, barWidth, -height * 3);
      var maxcut = function(x, max) {
        if (x > max) {
          return max;
        }
        return x;
      } 
      fillRoundRect({
        ctx : ctx,
        x : index * spacerWidth,
        y : ch,
        width: barWidth,
        height: -height * (1 + 1.2 * sigmoid(maxcut(height, 40)/40)),
        radius: barWidth / 3
      });
    }
    else{
      // ctx.fillRect(index * spacerWidth, ch, barWidth, -rand(2, 4));
      fillRoundRect({
        ctx : ctx,
        x : index * spacerWidth,
        y : ch,
        width: barWidth,
        height: -rand(4, 7),
        radius: barWidth / 3
      });
    }
  }

  // drawBottom(index) {
  //   const barWidth = cw / this.analyser.frequencyBinCount;
  //   const height = this.freqs[index];
  //   const hue = (index / this.analyser.frequencyBinCount) * 360;

  //   ctx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
  //   ctx.fillRect(index * barWidth, ch / 2, barWidth, -height);
  // }
}

/**
 * ビジュアライザを初期化する。
 */
const initVisualizer = function(buffer) {
  const visualizer = new Visualizer(buffer);
  const loading = document.getElementById('loading');
  loading.style.opacity = 0;
  loading.style.display = 'none';

  const button = document.getElementById('button');
  button.style.opacity = 1;
  // button.innerText = 'クリックして再生';
  button.addEventListener('click', () => {
    button.style.display = 'none';
    var statics = document.getElementsByClassName('static');
    for (var i of statics) {
      i.style.opacity = 1;
    }
    visualizer.play();
  });
};

/**
 * initialize
 */
const init = function() {
  const loader = new Loader(['sample.mp3'], initVisualizer);
  loader.loadBuffer();
};

/* utility functions */

/**
 * 引数で定めた範囲の数をランダムに返す。
 * @param {Number} min 最小値
 * @param {Number} max 最大値
 * @return {Number}
 */
const rand = (min, max) => Math.random() * (max - min) + min;

function sigmoid(x) {
  const a = 12.0
  const b = 0.5
  return 1.0 / (1.0 + Math.exp(a * (b - x)))
}
/**
 * 角丸四角形の描画
 */
function fillRoundRect(param) {
  var ctx = param.ctx;
  var x = param.x;
  var y = param.y;
  var width = param.width;
  var height = param.height;
  var radius = param.radius || 0;
  
  if (height < 0) {
    ctx.save();
    ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arc(x + width - radius, y - radius, radius, -Math.PI * 1.5, 0, true);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arc(x + width - radius, y + height + radius, radius, 0, -Math.PI * 0.5, true);
      ctx.lineTo(x + radius, y + height);
      ctx.arc(x + radius, y + height + radius, radius, -Math.PI * 0.5, -Math.PI, true);
      ctx.lineTo(x, y + radius);
      ctx.arc(x + radius, y - radius, radius, -Math.PI, -Math.PI * 1.5, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  else {
    ctx.save();
    ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, 0, false);
      ctx.lineTo(x + width, y + height - radius);
      ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI * 0.5, false);
      ctx.lineTo(x + radius, y + height);
      ctx.arc(x + radius, y + height - radius, radius, Math.PI * 0.5, Math.PI, false);
      ctx.lineTo(x, y + radius);
      ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

init();