import { useState, useEffect, useCallback } from "react";

const SOUNDS_LIST = {
  PLACE_SYMBOL: "place_symbol.wav",
  GAME_OVER: "game_over.wav",
  GAME_WIN: "game_win.wav",
};

type TSoundName = keyof typeof SOUNDS_LIST;
type TSoundsList = Record<TSoundName, HTMLAudioElement>;

const useSFX = () => {
  const [soundsList, setSoundsList] = useState<TSoundsList | null>(null);

  useEffect(() => {
    if (!soundsList) {
      const list = {} as TSoundsList;

      let sound: TSoundName;
      for (sound in SOUNDS_LIST) {
        list[sound] = new Audio(
          import.meta.env.BASE_URL + "sfx/" + SOUNDS_LIST[sound]
        );
      }

      for (sound in SOUNDS_LIST) {
        list[sound].load();
      }

      setSoundsList(list);
    }
  }, [soundsList]);

  const playSoundEffect = useCallback(
    (sfxName: TSoundName) => {
      try {
        const audioElement = soundsList![sfxName];
        // if (audioElement.HAVE_ENOUGH_DATA) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.play();
        // }
      } catch (error) {
        console.warn("Unable to play sound: ", error);
      }
    },
    [soundsList]
  );

  return { playSoundEffect };
};

export default useSFX;