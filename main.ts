import { Plugin } from "obsidian";
import Model from "./model";
import FutureDatesView from "./view";

class ObsidianFutureDatesPlugin extends Plugin {
	model: Model;

	async onload() {
		this.model = new Model(this);

		this.registerView(
			FutureDatesView.TYPE,
			(leaf) => new FutureDatesView(leaf, this.model, this.app.workspace)
		);

		this.app.workspace.onLayoutReady(() => {
			this.initLeaf();
		});
	}

	async onunload() {
		this.model.finish();
	}

	initLeaf(): void {
		if (this.app.workspace.getLeavesOfType(FutureDatesView.TYPE).length) {
			return;
		}
		const rightLeaf = this.app.workspace.getRightLeaf(false);
		if (rightLeaf) {
			rightLeaf.setViewState({
				type: FutureDatesView.TYPE,
			});
		}
	}
}

module.exports = ObsidianFutureDatesPlugin;
