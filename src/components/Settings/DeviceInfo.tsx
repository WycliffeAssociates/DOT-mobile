import {useTranslation} from "react-i18next";
import {IdeviceInfo} from "../../customTypes/types";

type AppMemoryInfoParams = {
  deviceInfo: IdeviceInfo | undefined;
};
export function AppMemoryInfo(props: AppMemoryInfoParams) {
  const {t} = useTranslation();

  const isEmptyObj =
    props.deviceInfo && Object.values(props.deviceInfo).every((v) => !v);
  if (!props.deviceInfo) return null;
  return (
    <div className="mt-4 px-2 pb-4">
      <h2 className="text-xl font-bold"> {t("deviceInfo")}</h2>
      {/* MEM USED */}
      {props.deviceInfo.memUsed && (
        <p>
          {t("memoryUsed")}:
          <span className="inline-block ml-2">{props.deviceInfo.memUsed}</span>
        </p>
      )}
      {/* AVAILABLE ON DISK */}
      {props.deviceInfo.realDiskFree && (
        <p>
          {t("approximateSpaceAvailable")}:
          <span className="inline-block ml-2">
            {props.deviceInfo.realDiskFree}
          </span>
        </p>
      )}
    </div>
  );
}
