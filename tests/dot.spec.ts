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
});
test("No horizontal scroll", async ({page}) => {
  // Navigate to the provided URL
  await page.goto("/benin");
  // Use page.evaluate to run custom JavaScript code on the page

  const doesNotHaveHorizontalScroll = await page.evaluate(
    () => document.body.scrollWidth <= window.innerWidth
  );
  expect(doesNotHaveHorizontalScroll).toBe(true);
});
test.only("New Testament renders 27 books", async ({page}) => {
  await page.goto("/benin");
  const playlistListing = page.getByTestId("booksAvailable");
  await playlistListing.waitFor();
  const books = playlistListing.locator("li");
  await expect(books).toHaveCount(27);
});
test("Matthew Renders 28 chapter buttons", async ({page}) => {
  await page.goto("/benin");

  const playlistListing = page.getByTestId("chapterSelector");
  await playlistListing.waitFor();
  const chapters = playlistListing.locator("li");

  await expect(chapters).toHaveCount(28);
});
test("state data attributes for chapter / vid are correct", async ({page}) => {
  await page.goto("/benin");

  const stateChecker = page.getByTestId("stateChecker");
  await stateChecker.waitFor();
  const dataCurBook = await stateChecker.getAttribute("data-currentbook");
  const isMatthew = dataCurBook === "MAT";
  const dataCur = await stateChecker.getAttribute("data-currentchap");
  const isChap1 = Number(dataCur) === 1;

  expect(isMatthew).toBeTruthy();
  expect(isChap1).toBeTruthy();
});

test.only("chapter changes on click", async ({page}) => {
  await page.goto("/benin");

  const chap2Btn = page
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

// testing vido
// How can i e2e test the player to ensure that it's playing once someone downloads somethign? Green check marks. But i'd like to actually test the player.
