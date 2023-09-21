import {IdeviceInfo} from "../../customTypes/types";

type AppMemoryInfoParams = {
  deviceInfo: IdeviceInfo | undefined;
};
export function AppMemoryInfo(props: AppMemoryInfoParams) {
  const isEmptyObj =
    props.deviceInfo && Object.values(props.deviceInfo).every((v) => !v);
  if (!props.deviceInfo) return null;
  return (
    <div>
      <h2> Device Info</h2>
      {/* MEM USED */}
      {props.deviceInfo.memUsed && (
        <p>
          Mem used
          {props.deviceInfo.memUsed}
        </p>
      )}
      {/* AVAILABLE ON DISK */}
      {props.deviceInfo.realDiskFree && (
        <p>
          Space available
          {props.deviceInfo.realDiskFree}
        </p>
      )}
    </div>
  );
}
