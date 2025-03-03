import { createApp } from "vue";

const DAISYUI_THEMES = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "pastel",
  "fantasy",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
  "dim",
  "nord",
  "sunset",
  "caramellatte",
  "abyss",
];

const app = createApp({
  data() {
    return {
      rawData:
        "Topic 1: 60min\nTopic 2: 20min\nTopic 3: 50min\nTopic 4: 20min\nTopic 5:10min\nTopic 6: 10min\nTopic 7: 10min",
      data: [],
      wheelPosition: 0,
      weighted: false,
      timeoutId: 0,
      showSelected: false,
      selected: 0,
      timerEnd: new Date(),
      timerStarted: false,
      date: new Date(),
      meetingStart: new Date(),
      elapsedTime: 0,
      initialSpin: true,
      initialColor: Math.floor(Math.random() * 4),
      rid: 0,
      beepTimer: null,
      sound: null,
      themes: DAISYUI_THEMES,
      currentTheme: "cmyk",
      spinning: false,
    };
  },
  computed: {
    selectedData() {
      return (
        this.data[this.selected] ?? {
          text: "???",
          time: 1,
          disabled: false,
        }
      );
    },
    noData() {
      return this.filteredData.length === 0;
    },
    filteredData() {
      return this.data.filter((item) => !item.disabled);
    },
    totalTime() {
      return this.elapsedTime + this.totalRemainingTime;
    },
    totalExpectedTime() {
      return this.data.reduce((sum, item) => sum + item.time, 0);
    },
    totalRemainingTime() {
      return this.filteredData.reduce((sum, item) => sum + item.time, 0);
    },
    overtimeTime() {
      return this.totalTime - this.totalExpectedTime;
    },
    startedAt() {
      const start = new Date(this.meetingStart.getTime());
      return start.getHours() * 60 + start.getMinutes();
    },
    estimatedEnd() {
      const end = new Date(this.meetingStart.getTime());
      const timerDelta = (this.timerEnd - this.date) / (1000 * 60);
      end.setMinutes(
        end.getMinutes() + this.totalTime - (this.timerStarted ? timerDelta : 0)
      );
      return end.getHours() * 60 + end.getMinutes();
    },
    svgData() {
      let totalAngle = 0;
      return this.filteredData.map((item, index) => {
        const ratio = this.weighted
          ? item.time / this.totalRemainingTime
          : 1 / this.filteredData.length;
        const angleRad = 2 * Math.PI * ratio;
        const angleDeg = (360 * ratio) % 360;
        const textScale = this.textScale(item.text, angleRad);
        totalAngle += angleDeg;
        const colorIndex =
          ((index === this.filteredData.length - 1 && index % 4 === 0 ? 1 : 0) +
            index +
            this.initialColor) %
          4;
        const color = ["primary", "secondary", "accent", "neutral"][colorIndex];
        return {
          id: item.id,
          text: item.text,
          textPosition: textScale * 0.95,
          textTransform: `scale(${1 / textScale})`,
          path: `M 0 0 L ${Math.cos(-angleRad / 2)} ${Math.sin(
            -angleRad / 2
          )} A 1 1 0 ${ratio > 0.5 ? 1 : 0} 1 ${Math.cos(
            angleRad / 2
          )} ${Math.sin(angleRad / 2)} z`,
          transform: `rotate(${totalAngle - angleDeg / 2}, 0, 0)`,
          textStyle: `fill: var(--color-${color}-content)`,
          backgroundStyle: `fill: var(--color-${color})`,
          from: totalAngle - angleDeg,
          to: totalAngle,
        };
      });
    },
  },
  watch: {
    rawData() {
      this.data = this.getData();
    },
  },
  mounted() {
    this.sound = new Audio("./sound.wav");
    this.rawData = atob(this.getCookie("rawData", btoa(this.rawData)));
    this.currentTheme = this.getCookie("theme", this.currentTheme);
    this.data = this.getData();
    setTimeout(this.showApp);
    setInterval(() => {
      this.rid = Math.random();
      if (this.timerStarted) {
        document.title = `${this.timerParts(0)}${this.timerParts(
          1
        )}:${this.timerParts(2)}:${this.timerParts(3)}`;
      }
      this.elapsedTime = (new Date() - this.meetingStart) / (1000 * 60);
      this.date = new Date();
    }, 200);
  },
  methods: {
    textScale(text, angleRad) {
      const ratio = 1.2;
      return (
        (text.length +
          ratio / (2 * Math.tan(Math.min(Math.PI, angleRad) / 2))) /
        ratio
      );
    },
    overtime() {
      return this.timerStarted && this.timerEnd - new Date() <= 0;
    },
    timerParts(index) {
      let delta = 0;
      if (this.timerStarted) {
        delta = Math.floor((this.timerEnd - new Date()) / 1000);
      } else if (this.showSelected) {
        delta = this.selectedData.time * 60;
      }
      if (index === 0) {
        return delta < 0 ? "-" : "";
      }
      const hours = Math.floor(Math.abs(delta) / 3600);
      if (index === 1) {
        return String(hours).padStart(2, "0");
      }
      const minutes = Math.floor(Math.abs(delta) / 60 - hours * 60);
      if (index === 2) {
        return String(minutes).padStart(2, "0");
      }
      const seconds = Math.abs(delta) % 60;
      return String(seconds).padStart(2, "0");
    },
    beep() {
      this.sound.play();
    },
    timeText(minutes, padHours = 0) {
      const prefix = minutes >= 0 ? "" : "-";
      const absMinutes = Math.abs(minutes);
      if (absMinutes >= 60 || padHours > 0) {
        return `${prefix}${Math.floor(absMinutes / 60)
          .toFixed(0)
          .padStart(padHours, "0")}h${(absMinutes % 60)
          .toFixed(0)
          .padStart(2, "0")}`;
      }
      return `${prefix}${(absMinutes % 60).toFixed(0).padStart(2, "0")}min`;
    },
    spin() {
      if (this.timerStarted || this.noData) return;
      this.showSelected = false;
      if (this.initialSpin) {
        this.meetingStart = new Date();
      }
      this.initialSpin = false;
      this.spinning = true;
      this.wheelPosition += 360 * 10 + Math.random() * 360;
      clearTimeout(this.timeoutId);
      this.selected = this.getSelected();
      this.timeoutId = setTimeout(() => {
        this.showSelected = true;
        this.spinning = false;
        confetti({
          particleCount: 400,
          startVelocity: 100,
          spread: 100,
          origin: { y: 0.9 }, // eslint-disable-line id-length
        });
      }, 5000);
    },
    getSelected() {
      if (this.svgData.length === 1) {
        return this.svgData[0].id;
      }
      const angle = 360 - (this.wheelPosition % 360);
      for (let index = 0; index < this.svgData.length; index += 1) {
        const element = this.svgData[index];
        if (angle >= element.from && angle < element.to) {
          return element.id;
        }
      }
      return 0;
    },
    getData() {
      const re =
        /:\s?(?:(?:(?<hours>\d+)\s?h)?(?<minutes>\d+)?(?:\s?m(?:in)?)?)\s?$/iu;
      this.setCookie("rawData", btoa(this.rawData));
      const data = this.rawData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length)
        .map((line, index) => {
          const result = re.exec(line);
          if (result === null) {
            return {
              id: index,
              text: line,
              time: 1,
              disabled: line.substring(0, 1) === "-",
            };
          }
          return {
            id: index,
            text: line.substring(0, result.index),
            time:
              parseInt(result.groups.hours ?? 0, 10) * 60 +
              parseInt(result.groups.minutes ?? 0, 10),
            disabled: line.substring(0, 1) === "-",
          };
        });
      if (data.length === 0) {
        return [
          {
            id: 0,
            text: "?",
            time: 1,
            disabled: false,
          },
        ];
      }
      return data;
    },
    showApp() {
      document.getElementById("app").setAttribute("style", "");
    },
    removeTopic() {
      let index = 0;
      this.rawData = this.rawData
        .split("\n")
        .map((line) => {
          let newLine = line;
          if (line.trim().length) {
            if (index === this.selected) {
              newLine = `-${line}`;
            }
            index += 1;
          }
          return newLine;
        })
        .join("\n");
      this.showSelected = false;
    },
    timerFunction() {
      this.timerStarted = !this.timerStarted;
      clearTimeout(this.beepTimer);
      if (this.timerStarted) {
        this.timerEnd = new Date(
          new Date().getTime() + this.selectedData.time * 60 * 1000
        );
        this.beepTimer = setTimeout(() => {
          this.beep();
        }, this.selectedData.time * 60 * 1000);
      } else {
        document.title = "Meeting Roulette";
      }
    },
    setCookie(cname, cvalue, exdays) {
      const date = new Date();
      date.setTime(date.getTime() + exdays * 24 * 60 * 60 * 1000);
      const expires = `expires=${date.toUTCString()}`;
      document.cookie = `${cname}=${cvalue}; path=/; ${expires}`;
    },
    getCookie(cname, defaultValue) {
      const name = `${cname}=`;
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(";");
      for (let index = 0; index < ca.length; index += 1) {
        let cookie = ca[index];
        while (cookie.charAt(0) === " ") {
          cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
          return cookie.substring(name.length, cookie.length);
        }
      }
      return defaultValue;
    },
    setTheme(value) {
      this.currentTheme = value;
      this.setCookie("theme", this.currentTheme);
    },
  },
});

window.onload = () => {
  app.mount("#app");
};
