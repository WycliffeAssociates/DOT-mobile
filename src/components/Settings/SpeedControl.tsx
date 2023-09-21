import {ChangeEvent, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {
  getSavedAppPreferences,
  updateSavedAppPreferences,
} from "../../lib/storage";
import {SpeedIcon} from "../Icons";
import {VideoJsPlayer} from "video.js";

type SpeedControlParams = {
  player: VideoJsPlayer | undefined;
};

export function SpeedControl(props: SpeedControlParams) {
  const {t} = useTranslation();
  const [preferredSpeed, setPreferredSpeed] = useState(1);

  async function setInitialPlayerSpeed() {
    const curAppState = await getSavedAppPreferences();
    if (!curAppState || !curAppState.preferredSpeed) return;
    setPreferredSpeed(curAppState.preferredSpeed);
  }

  useEffect(() => {
    setInitialPlayerSpeed();
  }, []);
  async function handlePreferredSpeedChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const player = props.player;
    const target = event.target as HTMLInputElement;
    if (!player) return;
    const amount = Number(target.value);

    player.playbackRate(amount);
    let curAppState = await getSavedAppPreferences();
    if (!curAppState) return;
    let newState = {
      ...curAppState,
      preferredSpeed: amount,
    };
    await updateSavedAppPreferences(newState);
  }

  return (
    <div data-name="videoSpeedControl" className="mb-4">
      <p>{t("preferredVideoSpeed")}</p>
      <span className="inline-flex gap-1 items-center">
        <input
          type="range"
          className="speedRange appearance-none bg-transparent cursor-pointer w-60 "
          min=".2"
          max="5"
          step=".1"
          value={preferredSpeed}
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            setPreferredSpeed(Number(target.value));
          }}
          onChange={(e) => {
            handlePreferredSpeedChange(e);
          }}
        />
        <span className="inline-block h-5 w-5">
          <SpeedIcon />{" "}
        </span>
        <span className="inline-block ml-2">{preferredSpeed}</span>
      </span>
    </div>
  );
}
