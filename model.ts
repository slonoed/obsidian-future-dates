import { Plugin, moment, TFile } from "obsidian";

const dailyFileRe = /^\d{4}-\d{2}-\d{2}\.md$/;
const dailyRe = /^\d{4}-\d{2}-\d{2}$/;

// source file -> texts where day (target) is mentioned
type Mentions = Record<string, Array<string>>;
// day file (target) -> source file -> mentions
type FutureNotes = Record<string, Mentions>;

export default class Model extends EventTarget {
	notes: FutureNotes = {};

	dates: Array<string> = [];
	plugin: Plugin;

	constructor(plugin: Plugin) {
		super();

		this.plugin = plugin;

		const cache = plugin.app.metadataCache;
		plugin.registerEvent(
			cache.on("resolved", () => {
				this.collectNotes();
				this.dates = [
					...this.extractDates(cache.resolvedLinks),
					...this.extractDates(cache.unresolvedLinks),
				];
				this.dates.sort();

				this.dates = this.dates.filter((date) => {
					return !moment(date).isBefore(moment(), "day");
				});

				this.dispatchEvent(new Event("change"));
			})
		);
	}

	finish() {}

	async collectNotes() {
		const allLinks = this.getMergedLinks();

		const notes: FutureNotes = {};

		for (const sourcePath in allLinks) {
			for (const targetPath in allLinks[sourcePath]) {
				const date = this.extractDate(targetPath);
				if (date && moment(date).isAfter(moment(), "day")) {
					if (!notes[date]) {
						notes[date] = {};
					}
					if (!notes[date][sourcePath]) {
						notes[date][sourcePath] = [];
					}

					const abstractFile =
						this.plugin.app.vault.getAbstractFileByPath(sourcePath);

					if (
						abstractFile !== null &&
						abstractFile instanceof TFile
					) {
						const content = await this.plugin.app.vault.cachedRead(
							abstractFile
						);

						const mentions = this.getSubstringsWithPattern(
							content,
							`[[${date}]]`
						);

						for (const mention of mentions) {
							console.log(mention);
							notes[date][sourcePath].push(mention);
						}
					}
				}
			}
		}

		this.notes = notes;
		this.dispatchEvent(new Event("change"));
	}

	extractDates(links: Record<string, Record<string, number>>): Array<string> {
		const dates: Array<string> = [];
		Object.values(links).forEach((files) => {
			Object.keys(files).forEach((link) => {
				if (dailyFileRe.test(link)) {
					const date = link.slice(0, -3);
					dates.push(date);
				} else if (dailyRe.test(link)) {
					dates.push(link);
				}
			});
		});
		return dates;
	}

	extractDate(fileName: string): string | null {
		if (dailyFileRe.test(fileName)) {
			return fileName.slice(0, -3);
		}
		if (dailyRe.test(fileName)) {
			return fileName;
		}

		return null;
	}

	getMergedLinks() {
		const cache = this.plugin.app.metadataCache;
		const allLinks: Record<string, Record<string, number>> = {};
		Object.assign(allLinks, cache.unresolvedLinks);

		// Merge resolved and unresolved links deep
		for (const sourceFile in cache.resolvedLinks) {
			if (!allLinks[sourceFile]) {
				allLinks[sourceFile] = {};
			}
			Object.assign(
				allLinks[sourceFile],
				cache.resolvedLinks[sourceFile]
			);
		}

		return allLinks;
	}

	getSubstringsWithPattern(text: string, pattern: string): string[] {
		const matches: string[] = [];
		const lines = text.split("\n");
		const patternLength = pattern.length;
		const maxContextLength = 50;

		for (const line of lines) {
			let startIndex = line.indexOf(pattern);
			while (startIndex !== -1) {
				const start = Math.max(startIndex - maxContextLength, 0);
				const end = Math.min(
					startIndex + patternLength + maxContextLength,
					line.length
				);
				matches.push(line.substring(start, end));

				startIndex = line.indexOf(pattern, startIndex + patternLength);
			}
		}

		return matches;
	}
}
