import {test, expect} from "@playwright/test";
import brightCovePlaylistConfig from "../src/brightcove/playlist-mappers";

// test('has title', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });

test("Home renders playlists", async ({page}) => {
  await page.goto("/");
  const playlistListing = page.getByTestId("playlistsAvailable");
  const listItems = playlistListing.getByRole("listitem");
  const alphabetizedKeys = Object.keys(
    brightCovePlaylistConfig
  ).sort() as unknown as Array<keyof typeof brightCovePlaylistConfig>;

  await expect(listItems).toHaveCount(alphabetizedKeys.length);
});

test("Listing on home page navigates to proper playlist", async ({page}) => {
  await page.goto("/");
  const playlistListing = page.getByRole("link", {name: "benin"});
  await playlistListing.click();
  expect(page.url().includes("benin"));
  // const listItems = playlistListing.getByRole("listitem");
  // listItems.
  // const alphabetizedKeys = Object.keys(
  //   brightCovePlaylistConfig
  // ).sort() as unknown as Array<keyof typeof brightCovePlaylistConfig>;

  // await expect(listItems).toHaveCount(alphabetizedKeys.length);
});
test("No horizontal scroll", async ({page}) => {
  // Navigate to the provided URL
  await page.goto("/benin");
  // Use page.evaluate to run custom JavaScript code on the page
  await page.waitForLoadState("networkidle");
  const doesNotHaveHorizontalScroll = await page.evaluate(
    () => document.body.scrollWidth <= window.innerWidth
  );
  expect(doesNotHaveHorizontalScroll).toBe(true);
});
test("New Testament renders 27 books", async ({page}) => {
  await page.goto("/benin");
  // await page.waitForLoadState("networkidle");
  const playlistListing = await page
    .getByTestId("booksAvailable")
    .locator("li");
  await expect(playlistListing).toHaveCount(27);
});
test("Matthew Renders 28 chapter buttons", async ({page}) => {
  await page.goto("/benin");
  // await page.waitForLoadState("networkidle");
  const playlistListing = await page
    .getByTestId("chapterSelector")
    .locator("li");

  await expect(playlistListing).toHaveCount(28);
});
test("state data attributes for chapter / vid are correct", async ({page}) => {
  await page.goto("/benin");

  await page.waitForLoadState("networkidle");
  const stateChecker = await page.getByTestId("stateChecker");
  const dataCurBook = await stateChecker.getAttribute("data-currentbook");
  const isMatthew = dataCurBook === "MAT";
  const dataCur = await stateChecker.getAttribute("data-currentchap");
  const isChap1 = Number(dataCur) === 1;

  expect(isMatthew).toBeTruthy();
  expect(isChap1).toBeTruthy();
});

test("chapter changes on click", async ({page}) => {
  await page.goto("/benin");

  await page.waitForLoadState("networkidle");
  const chap2Btn = await page
    .getByTestId("chapterSelector")
    .getByText("2", {exact: true});

  await chap2Btn.click();
  const stateChecker = await page.getByTestId("stateChecker");
  const dataCurBook = await stateChecker.getAttribute("data-currentbook");
  const isMatthew = dataCurBook === "MAT";
  const dataCur = await stateChecker.getAttribute("data-currentchap");
  const isChap2 = Number(dataCur) === 2;

  expect(isMatthew).toBeTruthy();
  expect(isChap2).toBeTruthy();
});

test("book changes on click", async ({page}) => {
  await page.goto("/benin");

  await page.waitForLoadState("networkidle");
  // const chap2Btn = await page
  //   .getByTestId("chapterSelector")
  //   .getByText("2", {exact: true});
  const bookPicked = page.getByTestId("bookPicked");
  const judeBtn = page
    .getByTestId("booksAvailable")
    .locator("li")
    .getByText("Jude");
  await judeBtn.click();
  const stateChecker = await page.getByTestId("stateChecker");
  const dataCurBook = await stateChecker.getAttribute("data-currentbook");
  const isJude = dataCurBook === "JUD";

  expect(isJude).toBeTruthy();
  await expect(bookPicked).toHaveText("Jude");
});
