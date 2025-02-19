let app = {
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
      initialColor: Math.random() * 360,
      rid: 0,
      beepTimer: undefined,
      sound: undefined,
    };
  },
  watch: {
    rawData() {
      this.data = this.getData();
    },
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
    filteredData() {
      return this.data.filter((item) => !item.disabled);
    },
    totalTime() {
      return this.elapsedTime + this.totalRemainingTime;
    },
    totalExpectedTime() {
      return this.data
        .map((item) => item.time)
        .reduce((a, b) => a + b, 0);
    },
    totalRemainingTime() {
      return this.filteredData
        .map((item) => item.time)
        .reduce((a, b) => a + b, 0);
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
      end.setMinutes(end.getMinutes() + this.totalTime - (this.timerStarted ? timerDelta : 0));
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
          color: `hsl(${this.initialColor + 100 * index} 80% 50%)`,
          from: totalAngle - angleDeg,
          to: totalAngle,
        };
      });
    },
  },
  methods: {
    textScale(text, angleRad) {
      const r = 1.2;
      const n = text.length;
      const k = n + r / (2 * Math.tan(Math.min(Math.PI, angleRad) / 2));
      return k / r;
    },
    overtime() {
      return this.timerStarted && this.timerEnd - new Date() <= 0;
    },
    timerText() {
      const delta = this.timerStarted
        ? Math.floor((this.timerEnd - new Date()) / 1000)
        : (this.showSelected
          ? this.selectedData.time * 60
          : 0);
      return `${delta < 0 ? "-" : ""}${String(
        Math.floor(Math.abs(delta) / 60)
      ).padStart(2, "0")}:${String(Math.abs(delta) % 60).padStart(2, "0")}`;
    },
    beep() {
      this.sound.play();
    },
    timeText(minutes, padHours = 0) {
      if (minutes >= 60 || padHours > 0) {
        return `${Math.floor(minutes / 60).toFixed(0).padStart(padHours, "0")}h${(minutes % 60).toFixed(0).padStart(2, "0")}`;
      } else {
        return `${(minutes % 60).toFixed(0).padStart(2, "0")}min`;
      }
    },
    spin() {
      if (this.timerStarted) return;
      this.showSelected = false;
      if (this.initialSpin) {
        this.meetingStart = new Date();
      }
      this.initialSpin = false;
      this.wheelPosition += 360 * 10 + Math.random() * 360;
      clearTimeout(this.timeoutId);
      this.selected = this.getSelected();
      this.timeoutId = setTimeout(() => {
        this.showSelected = true;
      }, 5000);
    },
    getSelected() {
      const angle = 360 - (this.wheelPosition % 360);
      for (let index = 0; index < this.data.length; index++) {
        const element = this.svgData[index];
        if (angle >= element.from && angle < element.to) {
          return element.id;
        }
      }
      return 0;
    },
    getData() {
      const re = /:\s?(?:(?:(\d+)\s?h)?(\d+)?(?:\s?m(?:in)?)?)\s?$/i;
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
          } else {
            return {
              id: index,
              text: line.substring(0, line.indexOf(result[0])),
              time: parseInt(result[1] ?? 0) * 60 + parseInt(result[2] ?? 0),
              disabled: line.substring(0, 1) === "-",
            };
          }
        });
      if (data.length === 0) {
        return [{
          id: 0,
          text: '?',
          time: 1,
          disabled: false,
        }];
      }
      return data;
    },
    showApp() {
      document.getElementById("app").setAttribute("style", "");
    },
    removeTopic() {
      let i = 0;
      this.rawData = this.rawData
        .split("\n")
        .map((line) => {
          if (line.trim().length) {
            if (i === this.selected) {
              line = "-" + line;
            }
            i += 1;
          }
          return line;
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
      const d = new Date();
      d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
      let expires = "expires=" + d.toUTCString();
      console.log(cname + "=" + cvalue + "; path=/; " + expires);
      document.cookie = cname + "=" + cvalue + "; path=/; " + expires;
    },
    getCookie(cname, defaultValue) {
      let name = cname + "=";
      let decodedCookie = decodeURIComponent(document.cookie);
      let ca = decodedCookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == " ") {
          c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
        }
      }
      return defaultValue;
    },
  },
  mounted: function () {
    console.log("app mounted");
    this.sound = new Audio("./sound.wav");
    this.rawData = atob(this.getCookie("rawData", btoa(this.rawData)));
    this.data = this.getData();
    setTimeout(this.showApp);
    setInterval(() => {
      this.rid = Math.random();
      if (this.timerStarted) {
        document.title = this.timerText();
      }
      this.elapsedTime = (new Date() - this.meetingStart) / (1000 * 60);
      this.date = new Date();
    }, 200);
  },
};

window.onload = () => {
  app = Vue.createApp(app);
  app.mount("#app");
};
