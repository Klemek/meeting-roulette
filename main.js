/* exported utils */

let app = {
  data() {
    return {
      rawData:
        "Topic 1: 60min\nTopic 2: 20min\nTopic 3: 50min\nTopic 4: 20min\nTopic 5:10min\nTopic 6: 10min\nTopic 7: 10min",
      data: [],
      wheelPosition: 0,
      wheighted: false,
      timeoutId: 0,
      showSelected: false,
      selected: 0,
      timerEnd: new Date(),
      timerStarted: false,
      initialSpin: true,
      initialColor: Math.random() * 360,
      rid: 0,
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
      return this.data.map((item) => item.time).reduce((a, b) => a + b, 0);
    },
    totalRemainingTime() {
      return this.filteredData
        .map((item) => item.time)
        .reduce((a, b) => a + b, 0);
    },
    svgData() {
      let totalAngle = 0;
      return this.filteredData.map((item, index) => {
        const ratio = this.wheighted
          ? item.time / this.totalRemainingTime
          : 1 / this.filteredData.length;
        const textScale = item.text.length * 1.1;
        const angleRad = 2 * Math.PI * ratio;
        const angleDeg = 360 * ratio;
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
    overtime() {
      return this.timerStarted && this.timerEnd - new Date() <= 0;
    },
    timerText() {
      const delta = this.timerStarted
        ? Math.floor((this.timerEnd - new Date()) / 1000)
        : this.showSelected
        ? this.selectedData.time * 60
        : 0;
      return `${delta < 0 ? '-' : ''}${String(Math.floor(Math.abs(delta) / 60)).padStart(2, "0")}:${String(
        Math.abs(delta) % 60
      ).padStart(2, "0")}`;
    },
    timeText(minutes) {
      if (minutes > 60) {
        return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(
          2,
          "0"
        )}`;
      } else {
        return `${String(minutes % 60).padStart(2, "0")}min`;
      }
    },
    spin() {
      if (this.timerStarted) return;
      this.showSelected = false;
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
      return this.rawData
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
      this.initialSpin = true;
    },
    timerFunction() {
      this.timerStarted = !this.timerStarted;
      if (this.timerStarted) {
        this.timerEnd = new Date(
          new Date().getTime() + this.selectedData.time * 60 * 1000
        );
      } else {
        document.title = "Meeting Roulette";
      }
    },
  },
  mounted: function () {
    console.log("app mounted");
    this.data = this.getData();
    setTimeout(this.showApp);
    setInterval(() => {
      this.rid = Math.random();
      if (this.timerStarted) {
        document.title = this.timerText();
      }
    }, 200);
  },
};

window.onload = () => {
  app = Vue.createApp(app);
  app.mount("#app");
};
