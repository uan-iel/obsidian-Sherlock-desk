import { App, PluginSettingTab, Setting } from "obsidian";
import type SherlockOSPlugin from "./main";

export class SherlockSettingTab extends PluginSettingTab {
  plugin: SherlockOSPlugin;

  constructor(app: App, plugin: SherlockOSPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Sherlock OS Settings" });

    this.addTextSetting(containerEl, "案件文件夹", this.plugin.settings.caseFolder, async (value) => {
      this.plugin.settings.caseFolder = value.trim() || "Sherlock OS/Cases";
      await this.plugin.saveSettings();
    });

    this.addTextSetting(containerEl, "任务文件夹", this.plugin.settings.taskFolder, async (value) => {
      this.plugin.settings.taskFolder = value.trim() || "Sherlock OS/Tasks";
      await this.plugin.saveSettings();
    });

    this.addTextSetting(containerEl, "排期文件夹", this.plugin.settings.scheduleFolder, async (value) => {
      this.plugin.settings.scheduleFolder = value.trim() || "Sherlock OS/Schedules";
      await this.plugin.saveSettings();
    });

    new Setting(containerEl)
      .setName("雾气强度")
      .setDesc("控制首页氛围层的存在感。")
      .addSlider((slider) =>
        slider.setLimits(0, 100, 1).setValue(this.plugin.settings.fogDensity).setDynamicTooltip().onChange(async (value) => {
          this.plugin.settings.fogDensity = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("动态强度")
      .setDesc("为后续首页动态和周排期动画预留。")
      .addSlider((slider) =>
        slider.setLimits(0, 100, 1).setValue(this.plugin.settings.motionIntensity).setDynamicTooltip().onChange(async (value) => {
          this.plugin.settings.motionIntensity = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private addTextSetting(containerEl: HTMLElement, name: string, value: string, onChange: (value: string) => Promise<void>): void {
    new Setting(containerEl)
      .setName(name)
      .addText((text) => text.setPlaceholder(value).setValue(value).onChange(onChange));
  }
}
