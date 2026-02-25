# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension for Chinese-English bidirectional translation. Select Chinese text to translate to English, select English text to translate to Chinese. Uses text selection context menu and popup display.

## Architecture

- **Manifest V3** Chrome extension
- `manifest.json` — extension config, permissions (contextMenus, activeTab, storage)
- `background.js` — service worker handling context menu events and translation API calls
- `content.js` — content script injected into pages, handles text selection and displays translation popup
- `popup/` — extension popup UI (optional settings page)
- `styles/` — CSS for translation popup overlay

Translation flow:
1. User selects text on page → content script detects selection
2. Context menu click or keyboard shortcut triggers translation
3. Background service worker calls translation API
4. Result sent back to content script → displayed in floating popup near selection

## Build & Development

No build step required — load as unpacked extension in `chrome://extensions/` with Developer Mode enabled.

To test changes: reload the extension in `chrome://extensions/` after editing files.

## Translation API

Uses a free translation API (e.g., Google Translate unofficial API or MyMemory API) to avoid requiring API keys for basic usage. Language detection determines translation direction automatically.

## Key Conventions

- All messages between content script and background use `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`
- Popup UI is injected via Shadow DOM to avoid CSS conflicts with host pages
- Language detection: if selected text contains CJK characters (Unicode range `\u4e00-\u9fff`), translate to English; otherwise translate to Chinese
