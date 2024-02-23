import { ItemView, WorkspaceLeaf, Plugin, Workspace } from "obsidian";

const dailyFileRe = /\d{4}-\d{2}-\d{2}\.md/;
const dailyRe = /\d{4}-\d{2}-\d{2}/;

const VIEW_TYPE = "obsidian-future-dates-view";

class Model {
	dates: Array<string>;

	constructor(plugin: Plugin) {
		const cache = plugin.app.metadataCache;
		plugin.registerEvent(
			cache.on("resolved", () => {
				this.dates = [
					...this.extractDates(cache.resolvedLinks),
					...this.extractDates(cache.unresolvedLinks),
				];
				this.dates.sort();
			})
		);
	}

	finish() {}

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
}

class FutureDatesView extends ItemView {
	model: Model;
	workspace: Workspace;

	constructor(leaf: WorkspaceLeaf, model: Model, workspace: Workspace) {
		super(leaf);

		this.workspace = workspace;
		this.model = model;
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "My Custom View";
	}

	async onOpen() {
		const cont = this.containerEl;
		const ul = cont.createEl("ul");
		for (const date of this.model.dates) {
			const d = date;
			const a = this.contentEl.createEl("a", { text: date, href: "#" });
			a.addEventListener("click", (event) => {
				event.preventDefault();
				this.workspace.openLinkText(d, "/", false);
			});
			const li = cont.createEl("li");
			li.appendChild(a);
			ul.appendChild(li);
		}

		cont.children[1].appendChild(ul);
	}

	async onClose() {}
}

class ObsidianFutureDatesPlugin extends Plugin {
	model: Model;

	async onload() {
		this.model = new Model(this);

		this.registerView(
			VIEW_TYPE,
			(leaf) => new FutureDatesView(leaf, this.model, this.app.workspace)
		);

		if (this.app.workspace.layoutReady) {
			this.initLeaf();
		} else {
			this.registerEvent(
				this.app.workspace.on("layout-ready", this.initLeaf.bind(this))
			);
		}
	}

	async onunload() {
		this.app.workspace
			.getLeavesOfType(VIEW_TYPE)
			.forEach((leaf) => leaf.detach());

		this.model.finish();
	}

	initLeaf(): void {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE).length) {
			return;
		}
		this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_TYPE,
		});
	}
}

module.exports = ObsidianFutureDatesPlugin;
