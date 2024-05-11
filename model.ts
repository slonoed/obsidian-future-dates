import { Plugin, moment, TFile } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";

// source file -> texts where day (target) is mentioned
export type Mentions = Record<string, Array<string>>;
// day file (target) -> source file -> mentions
export type FutureNotes = Record<string, Mentions>;

const dailyRe = /^\d{4}-\d{2}-\d{2}$/;

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
			})
		);
		this.collectNotes();
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
				const r = this.extractDate(link);
				if (r) {
					dates.push(r);
				}
			});
		});
		return dates;
	}

	extractDate(fileName: string): string | null {
		if (fileName.endsWith(".md")) {
			fileName = fileName.slice(0, -3);
		}

		const { format } = getDailyNoteSettings();
		if (format) {
			if (moment(fileName, format, true).isValid()) {
				return fileName;
			}
			return null;
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
