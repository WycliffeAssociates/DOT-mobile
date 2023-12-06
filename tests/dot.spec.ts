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
test("New Testament renders 27 books", async ({page}) => {
  await page.goto("/benin");
  const playlistListing = page.getByTestId("booksAvailable");
  await playlistListing.waitFor({
    state: "attached",
  });
  const books = playlistListing.locator("li");
  await expect(books).toHaveCount(27);
});
test("Matthew Renders 28 chapter buttons", async ({page}) => {
  await page.goto("/benin");

  const playlistListing = page.getByTestId("chapterSelector");
  await playlistListing.waitFor({
    state: "attached",
  });
  const chapters = playlistListing.locator("li");

  await expect(chapters).toHaveCount(28);
});
test("state data attributes for chapter / vid are correct", async ({page}) => {
  await page.goto("/benin");

  const stateChecker = page.getByTestId("stateChecker");
  await stateChecker.waitFor();

  await expect(stateChecker).toHaveAttribute("data-currentbook", /MAT/);
  await expect(stateChecker).toHaveAttribute("data-currentchap", /^0*1$/);
});

test("chapter changes on click", async ({page}) => {
  await page.goto("/benin");

  const chap2Btn = page
    .getByTestId("chapterSelector")
    .getByText("2", {exact: true});

  await chap2Btn.click();
  const stateChecker = page.getByTestId("stateChecker");
  await expect(stateChecker).toHaveAttribute("data-currentbook", /MAT/);
  await expect(stateChecker).toHaveAttribute("data-currentchap", /^0*2$/);
});

test("book changes on click", async ({page}) => {
  await page.goto("/benin");

  const bookPicked = page.getByTestId("bookPicked");

  const judeBtn = page
    .getByTestId("booksAvailable")
    .locator("li")
    .getByText("Jude");
  await judeBtn.click();
  const stateChecker = page.getByTestId("stateChecker");
  expect(stateChecker).toHaveAttribute("data-currentbook", "JUD");
  await expect(bookPicked).toHaveText("Jude");
});

// testing vido
// How can i e2e test the player to ensure that it's playing once someone downloads somethign? Green check marks. But i'd like to actually test the player.
