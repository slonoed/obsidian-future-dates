import { ItemView, WorkspaceLeaf, Workspace } from "obsidian";
import Model, { type FutureNotes } from "./model";

export default class View extends ItemView {
	static TYPE = "obsidian-future-dates-view";

	model: Model;
	workspace: Workspace;

	constructor(leaf: WorkspaceLeaf, model: Model, workspace: Workspace) {
		super(leaf);

		this.workspace = workspace;
		this.model = model;
		this.model.addEventListener("change", this.onModelChange.bind(this));
	}

	getViewType(): string {
		return View.TYPE;
	}

	getDisplayText(): string {
		return "Future dates";
	}

	async onOpen() {
		this.renderContent();
	}

	async onClose() {}

	renderContent() {
		const cont = this.containerEl;
		const wrapper = cont.createDiv();

		// Create top-level list for dates and append it to the wrapper
		const datesList = this.createDatesList(this.model.notes);
		wrapper.appendChild(datesList);

		// Clear existing content and append the new list structure
		cont.children[1].innerHTML = "";
		cont.children[1].appendChild(wrapper);
	}

	createDatesList(notes: FutureNotes) {
		const datesList = document.createElement("ul");
		Object.keys(notes)
			.sort()
			.forEach((date) => {
				const dateItem = this.createDateItem(date, notes[date]);
				datesList.appendChild(dateItem);
			});

		return datesList;
	}

	createDateItem(date: string, files: Record<string, Array<string>>) {
		const dateItem = document.createElement("li");
		const dateLink = this.createLink(date, date);
		dateItem.appendChild(dateLink);

		const filesList = this.createFilesList(files);
		dateItem.appendChild(filesList);

		return dateItem;
	}

	createFilesList(files: Record<string, Array<string>>) {
		const filesList = document.createElement("ul");
		for (const file in files) {
			const fileItem = this.createFileItem(file, files[file]);
			filesList.appendChild(fileItem);
		}
		return filesList;
	}

	createFileItem(file: string, mentions: Array<string>) {
		const fileItem = document.createElement("li");
		const fileLink = this.createLink(file, file);
		fileItem.appendChild(fileLink);

		const mentionsList = this.createMentionsList(mentions);
		fileItem.appendChild(mentionsList);

		return fileItem;
	}

	createMentionsList(mentions: Array<string>) {
		const mentionsList = document.createElement("ul");
		for (const mention of mentions) {
			const mentionItem = document.createElement("li");
			mentionItem.innerHTML = mention; // Be cautious with innerHTML due to potential security risks
			mentionsList.appendChild(mentionItem);
		}
		return mentionsList;
	}

	createLink(text: string, href: string) {
		const link = document.createElement("a");
		link.textContent = text;
		link.href = "#";
		link.addEventListener("click", (event) => {
			event.preventDefault();
			this.workspace.openLinkText(href, "/", false);
		});
		return link;
	}

	onModelChange() {
		this.renderContent();
	}
}
