/*

    A lot of dodgy code, proceed with care

*/
const colorThief = new ColorThief();

const width = 320;
let height = 0;

let streaming = false;

let video = null;
let canvas = null;
let photo = null;
let colorBox = null;
let colorBoxes = null;
let boxCountInput = null;
let downloadButton = null;

function createColorBoxes(count = 10) {
    colorBox.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const box = document.createElement("div");
        box.classList.add("box");
        colorBox.appendChild(box);
    }
    return document.querySelectorAll(".box");
}

function makeid(length) {
    let result = "";
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    return result;
}

function showViewLiveResultButton() {
    if (window.self !== window.top) {
        document.querySelector(".contentarea").remove();
        const button = document.createElement("button");
        button.textContent = "View live result of the example code above";
        document.body.append(button);
        button.addEventListener("click", () => window.open(location.href));
        return true;
    }
    return false;
}

function startup() {
    if (showViewLiveResultButton()) {
        return;
    }

    video = document.getElementById("video");
    canvas = document.getElementById("canvas");
    photo = document.getElementById("photo");
    colorBox = document.querySelector(".colorBox");
    colorBoxes = createColorBoxes();
    boxCountInput = document.getElementById("boxCount");
    downloadButton = document.getElementById("download");

    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
        })
        .catch((err) => {
            console.error(`An error occurred: ${err}`);
        });

    video.addEventListener(
        "canplay",
        (ev) => {
            if (!streaming) {
                height = video.videoHeight / (video.videoWidth / width);

                // Firefox currently has a bug where the height can't be read from
                // the video, so we will make assumptions if this happens.
                if (isNaN(height)) {
                    height = width / (4 / 3);
                }

                video.setAttribute("width", width);
                video.setAttribute("height", height);
                canvas.setAttribute("width", width);
                canvas.setAttribute("height", height);
                streaming = true;
            }
        },
        false
    );

    boxCountInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }

        const newCount = event.target.value;
        if (newCount != colorBox.childElementCount) {
            colorBoxes = createColorBoxes(newCount);
        }
    });

    downloadButton.addEventListener("click", async () => {
        domtoimage.toJpeg(colorBox, { quality: 0.95 }).then((dataUrl) => {
            const filename = `pholours-${makeid(5)}.png`;
            const link = document.createElement("a");
            link.setAttribute("download", filename);
            link.setAttribute("href", dataUrl);
            link.click();
        });
    });

    photo.addEventListener("load", () => {
        drawColours(photo);
    });

    setInterval(() => {
        takepicture();
    }, 1000);
}

function extendPalette(palette) {
    const rgbColours = [];

    for (let index = 0; index < colorBoxes.length; index++) {
        const paletteIndex =
            index >= palette.length ? index % palette.length : index;
        const rgbColor = palette[paletteIndex] || [];
        rgbColours.push(rgbColor);
    }

    return rgbColours;
}

function shuffle(palette) {
    for (let i = palette.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [palette[i], palette[j]] = [palette[j], palette[i]];
    }

    return palette;
}

function sort(palette) {
    const rgbToHsl = (c) => {
        let r = c[0] / 255,
            g = c[1] / 255,
            b = c[2] / 255;
        let max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        let h,
            s,
            l = (max + min) / 2;

        if (max == min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return new Array(h * 360, s * 100, l * 100);
    };

    return palette
        .map((c, i) => ({ color: rgbToHsl(c), index: i }))
        .sort((c1, c2) => c1.color[2] - c2.color[2])
        .map((data) => palette[data.index]);
}

function getDisplayType() {
    const defaultDisplayType = "sort";
    const displayTypeInput = document.querySelector(
        'input[name="displayType"]:checked'
    );
    const displayType = displayTypeInput
        ? displayTypeInput.value
        : defaultDisplayType;
    return displayType;
}

function drawColours(image) {
    const colourCount = colorBoxes.length === 1 ? 2 : colorBoxes.length;
    const palette = colorThief.getPalette(image, colourCount);
    const extendedPalette = extendPalette(palette);
    let rgbColours = [];
    const displayType = getDisplayType();

    if (displayType === "sort") {
        rgbColours = sort(extendedPalette);
    } else if (displayType === "shuffle") {
        rgbColours = shuffle(extendedPalette);
    }

    colorBoxes.forEach((box, index) => {
        const rgbString = rgbColours[index].join(", ");
        box.style.backgroundColor = `rgb(${rgbString})`;
    });
}

function takepicture() {
    const context = canvas.getContext("2d");
    if (width && height) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);

        const data = canvas.toDataURL("image/png");
        photo.setAttribute("src", data);

        if (photo.complete) {
            drawColours(photo);
        }
    }
}

const mobileDevice = "ontouchstart" in document.documentElement;
if (mobileDevice) {
    document.body.innerHTML = "<p id='mobile'>Open in desktop browser</p>";
} else {
    window.addEventListener("load", startup, false);
}
