type IJumpDisplay = {
  id: string;
  dir: "back" | "forward";
  text: string;
};
export function JumpDisplay(props: IJumpDisplay) {
  let baseClassName =
    "absolute w-1/4  top-0 bottom-0 seekRipple grid grid place-content-center  z-40 text-base pointer-events-none capitalize font-bold";
  let addlClassName =
    props.dir == "back"
      ? "left-0    rounded-[0%_100%_100%_0%_/_50%_50%_50%_50%] "
      : "right-0       rounded-[100%_0%_0%_100%_/_50%_50%_50%_50%] ";

  let finalClassName = `${baseClassName} ${addlClassName}`;
  return (
    <span id={props.id} className={finalClassName}>
      {props.text}
    </span>
  );
}
