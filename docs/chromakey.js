class ChromaKey {
  constructor({ $video }) {
    this._$els = {
      $video,
      $tempCanvas: null,
      $destCanvas: null
    };

    this._settings = {
      color: [0, 255, 0],
      threshold: 100,
      backgroundColor: [0, 255, 0],
      backgroundMedia: null
    };

    this._timer = null;
  }

  get targetColor() {
    return [...this._settings.color];
  }

  get targetThreshold() {
    return this._settings.threshold;
  }

  get destination() {
    return this._$els.$destCanvas;
  }

  setColor(rgb) {
    if (Array.isArray(rgb) === false)
      throw new TypeError("RGB must be an array of number!");
    if (rgb.some(c => typeof c !== "number"))
      throw new TypeError("RGB must be an array of number!");

    this._settings.color = rgb;
  }

  setColorByOffset(offsetX, offsetY) {
    if (!(typeof offsetX === "number" && typeof offsetY === "number"))
      throw new TypeError("Offset X and Y must be a number!");

    const tempContext = this._$els.$tempCanvas.getContext("2d");
    const {
      data: [r, g, b]
    } = tempContext.getImageData(offsetX, offsetY, 1, 1);
    this._settings.color = [r, g, b];
  }

  setThreshold(value) {
    value = Number(value);
    if (isNaN(value))
      throw new TypeError("Threshold must be a number!");

    this._settings.threshold = 255 - value;
  }

  setBackgroundMedia($canvasImageSource) {
    if (
      !(
        $canvasImageSource instanceof HTMLImageElement ||
        $canvasImageSource instanceof HTMLVideoElement ||
        $canvasImageSource instanceof HTMLCanvasElement
      )
    )
      throw new TypeError(
        "Media must be either one of img, video and canvas element!"
      );

    this._settings.backgroundMedia = $canvasImageSource;
  }

  setBackgroundColor(rgb) {
    if (Array.isArray(rgb) === false)
      throw new TypeError("RGB must be an array of number!");
    if (rgb.some(c => typeof c !== "number"))
      throw new TypeError("RGB must be an array of number!");

    this._settings.backgroundColor = rgb;
    this._settings.backgroundMedia = null;
  }

  start() {
    this._$els.$tempCanvas = document.createElement("canvas");
    this._$els.$destCanvas = document.createElement("canvas");

    const { $tempCanvas, $destCanvas } = this._$els;
    const { videoWidth, videoHeight } = this._$els.$video;

    $tempCanvas.width = $destCanvas.width = videoWidth;
    $tempCanvas.height = $destCanvas.height = videoHeight;

    this._draw();
  }

  stop() {
    cancelAnimationFrame(this._timer);
    this._timer = null;
  }

  _draw() {
    this._timer = requestAnimationFrame(this._draw.bind(this));

    const { $video, $tempCanvas, $destCanvas } = this._$els;
    const {
      color,
      threshold,
      backgroundColor,
      backgroundMedia
    } = this._settings;

    const tempContext = $tempCanvas.getContext("2d");
    const destContext = $destCanvas.getContext("2d");

    // video -> canvas(temp)
    tempContext.drawImage($video, 0, 0, $tempCanvas.width, $tempCanvas.height);

    const imageData = tempContext.getImageData(
      0,
      0,
      $tempCanvas.width,
      $tempCanvas.height
    );
    // [pixel1(r, g, b, a), pixel2, ..., pixelN]
    const { data } = imageData;
    for (let i = 0, l = data.length; i < l; i += 4) {
      const rgb1 = color;
      const rgb2 = [data[i], data[i + 1], data[i + 2]];

      const gap = Math.sqrt(
        Math.pow(rgb1[0] - rgb2[0], 2) +
          Math.pow(rgb1[1] - rgb2[1], 2) +
          Math.pow(rgb1[2] - rgb2[2], 2)
      );

      if (gap < threshold) {
        data[i + 3] = 0;
      }
    }

    // update canvas(temp) w/ opacity
    tempContext.putImageData(imageData, 0, 0);

    // apply background
    if (backgroundMedia === null) {
      destContext.fillStyle = `rgb(${backgroundColor.join(",")})`;
      destContext.fillRect(0, 0, $destCanvas.width, $destCanvas.height);
    } else {
      destContext.drawImage(
        backgroundMedia,
        0,
        0,
        $destCanvas.width,
        $destCanvas.height
      );
    }

    // merge canvas(temp) and background
    destContext.drawImage(
      $tempCanvas,
      0,
      0,
      $destCanvas.width,
      $destCanvas.height
    );
  }
}

function create($video, options) {
  if ($video instanceof HTMLVideoElement === false)
    throw new TypeError("Video element is required!");

  return new ChromaKey({ ...options, $video });
}

export { create };
