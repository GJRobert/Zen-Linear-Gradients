// ==UserScript==
// @name           Zen 多色軸線漸層
// @description    Zen 1.24.1b 的 getGradient() 只用前 3 色且角度固定；此腳本改回「全部顏色、依序、可自訂角度」的 linear-gradient，仍沿用 Zen 的低飽和度與透明度算法（compositeOverUnderlay）。
// @include        main
// ==/UserScript==

(() => {
  // 各工作區角度（deg），key 為 workspace uuid 前 8 碼；未列者用 DEFAULT_ANGLE。
  const ANGLES = {
    // "c8480798": -37, // 例：某工作區的 uuid 前 8 碼 → 角度
  };
  const DEFAULT_ANGLE = 67;
  // 側邊欄專用角度（同上 key）；未列者沿用該工作區的角度。例：{ "c8480798": 180 }
  const SIDEBAR_ANGLES = {};

  const patch = picker => {
    const proto = Object.getPrototypeOf(picker);
    if (proto.__multistopPatched) {
      return false;
    }
    const origGetGradient = proto.getGradient;
    const origForWorkspace = proto.getGradientForWorkspace;
    const origOnChange = proto.onWorkspaceChange;

    const withUuid = (self, workspace, fn) => {
      const prev = self.__msUuid;
      self.__msUuid = workspace?.uuid;
      try {
        return fn();
      } finally {
        self.__msUuid = prev;
      }
    };

    proto.getGradientForWorkspace = function (workspace, ...rest) {
      return withUuid(this, workspace, () =>
        origForWorkspace.call(this, workspace, ...rest)
      );
    };
    proto.onWorkspaceChange = function (workspace, ...rest) {
      return withUuid(this, workspace, () =>
        origOnChange.call(this, workspace, ...rest)
      );
    };

    proto.getGradient = function (colors, forToolbar = false) {
      const themed = this.themedColors(colors);
      if (themed.length < 3) {
        return origGetGradient.call(this, colors, forToolbar);
      }
      const ordered = [...themed].sort(
        (a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
      );
      const rgbs = ordered.map(color => {
        if (typeof color.c !== "string") {
          return color.c;
        }
        const rgba = InspectorUtils.colorToRGBA(color.c, document);
        return rgba ? [rgba.r, rgba.g, rgba.b] : [0, 0, 0];
      });

      const translucent = forToolbar
        ? Services.prefs.getBoolPref("zen.theme.acrylic-sidebar", false)
        : this.canBeTransparent;
      const paintAlpha = translucent
        ? this.translucentLayerAlpha
        : this.layerAlpha;
      const stops = rgbs.map((rgb, i) => {
        const [r, g, b] = this.compositeOverUnderlay(rgb, paintAlpha);
        const pos = ((i / (rgbs.length - 1)) * 100).toFixed(2);
        return translucent
          ? `rgba(${r}, ${g}, ${b}, ${this.windowAlpha}) ${pos}%`
          : `rgb(${r}, ${g}, ${b}) ${pos}%`;
      });

      const uuid =
        this.__msUuid ?? window.gZenWorkspaces?.getActiveWorkspace?.()?.uuid ?? "";
      const key = String(uuid).slice(0, 8);
      const angle =
        (forToolbar ? SIDEBAR_ANGLES[key] : undefined) ??
        ANGLES[key] ??
        DEFAULT_ANGLE;
      return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
    };
    proto.__multistopPatched = true;
    return true;
  };

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    const picker = window.gZenThemePicker;
    if (picker?.promiseInitialized && window.gZenWorkspaces?.getActiveWorkspace?.()) {
      clearInterval(timer);
      patch(picker);
      console.log("[multistop] getGradient 已替換");
      try {
        picker.onWorkspaceChange(window.gZenWorkspaces.getActiveWorkspace());
      } catch (e) {
        console.error("[multistop] 重新套用失敗", e);
      }
    } else if (tries > 100) {
      clearInterval(timer);
      console.error("[multistop] 等不到 gZenThemePicker，放棄");
    }
  }, 200);
})();
