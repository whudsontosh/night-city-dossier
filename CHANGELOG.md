# Changelog

Add a section at the top for each new version before pushing the version bump. The text under the version heading becomes the GitHub release notes and is shown in the app's update window.

## 1.4.1
- Item explanations in the shop: point at any weapon, armor, cyberware or gear (or tap its name on a phone) to see exactly what it does. On a wide window the explanation shows in a panel beside the list. On a narrower one it floats next to the item, and on a phone it slides up from the bottom.
  - Weapons: your actual to-hit number, damage range and average, which armor a typical hit gets through, rate of fire and bursts, magazine, range bands in meters, how likely it is to jam, how easy it is to hide, and where to buy it.
  - Armor: which locations it covers, how your SP changes if you wear it, and what it costs you in REF.
  - Cyberware: what it does, what it needs installed first, its Humanity cost and what it would do to your Humanity and EMP.
  - Gear: what it's for and which skills it helps.
  - The same explanations show when you point at weapons, armor, cyberware and gear you already own on your sheet.
- Attack: a simple way to roll an attack and its damage. Open **Attack…** on any weapon (Combat tab), from the dice tray, or from your weapon buttons at the table. Pick the weapon and how far away the target is, then press Attack. It rolls to hit and, if you hit, rolls damage for every round that lands, each with its own hit location.
  - Handles single shots, 3-round bursts and full auto, aimed shots (−4), modifiers, punches and kicks, melee (opposed: tell your GM your total) and **Damage only** for when your GM says you hit.
  - Uses ammo and warns you when the magazine is empty (with a Reload button). Fumbles miss and can jam the gun, depending on its reliability.
  - At the table, the attack and the damage both appear in the table log.

## 1.4.0
- Night City Dossier now runs on Mac as well as Windows. Each release has a Mac disk image (`Night-City-Dossier-1.4.0.dmg`) that works on Apple Silicon and Intel Macs with macOS 11 or later. See the README for the one-time "Open Anyway" step, since the app isn't notarised by Apple.
- Windows and Mac players can share a game: a GM on either can host, and players on either can join with the same invite code. Character files, GM campaign files and backups move freely between the two.
- The Mac app updates itself like the Windows one: on launch it downloads the new version, checks it and swaps itself in Applications, then reopens. If it isn't in Applications it offers to move itself there first.
- Online hosting on a Mac uses Cloudflare's Mac connector (about 20 MB, downloaded once and checked against Cloudflare's published checksum).
- Mac touches: the usual app menu (About, Check for Updates, Hide, Quit), Cmd shortcuts, Mac wording for folders, copy shortcuts and the firewall prompt, and faster trackpad pinch-zoom on the battle map.
- Help menu: new "Download page" item.

## 1.3.3
- Dice fixed: the dice tray opens in the bottom-right corner again. Since 1.2.0 it had been landing half off the screen, and on the battle map it squashed the map.
- Skill check: a simple way to roll any check. Open it from **Skill check…** in the dice tray, on the Skills tab, or in your panel at the table. Pick a skill (search, or show all) or a plain stat, choose how hard it is (Easy 10 to Nearly impossible 30), add a modifier and any Luck you want to spend, and roll. It shows the total, success or failure and the margin. At the table, the roll and its difficulty go to the table log.
- Rolls follow the CP2020 rules more closely: a natural 1 is a fumble and always fails (with a button to roll for the fumble table), and a natural 10 is marked Critical and rolls again. Fumble and Critical now show in the toast, the dice tray and the table log.
- The dice tray keeps what you typed after a roll, so you can roll it again, and accepts "d10x" or "d10!" for an exploding D10.
- Map sidebar: wider by default (420 px), and you can drag its left edge to resize it (or use the arrow keys). The width is remembered; double-click the edge to reset.
- Delete maps: every map in the Maps list has a delete button. The confirmation says what goes with it and which map players will see instead. A restore point is saved first, so a deleted map can be brought back from Backups → Version history.
- The README no longer includes the steps for publishing a release.

## 1.3.2
- Several campaigns: the GM console now keeps as many campaigns as you like. Each has its own party, maps, encounter, NPCs, notes, session log, room password, version history and backup files.
- New Campaigns screen (the yellow button with the campaign's name at the left of the menu). Open, rename, duplicate, download or delete a campaign, start a new one (optionally copying your custom NPCs), or import a campaign file.
- When you have more than one campaign, the GM console opens on the Campaigns screen so you can choose which one to run.
- Open & host opens a campaign and puts it online straight away, using the hosting mode you used last. If you're already hosting, the app asks first, then closes the old table and disconnects its players before switching. The Host game window shows which campaign is being hosted.
- Deleting a campaign asks you to type its name. Deleted campaigns go to Recently deleted on the Campaigns screen, where you can restore them.
- Dropping a GM backup file onto the console now asks whether to add it as a new campaign or replace the open one.
- Your existing campaign carries over automatically as the first campaign, with its history and backup files.

## 1.3.1
- GMs can remove players from the party: a Remove button on every row of the Party table, "Remove from party…" on a runner's page, and in the Host game window next to each connected player.
- The confirmation shows exactly what happens and asks you to type the runner's handle. The runner leaves the party along with their tokens, their place in the current encounter and your GM notes, and the player is disconnected. A restore point is saved first (Backups → Version history).
- Optionally block the player from rejoining with the invite code. Blocked players are listed in the Host game window with an Unblock button.
- "Remove" for a connected player is now called "Disconnect": it only drops their connection, and they can rejoin.

## 1.3.0
- Guided build: New character now asks Guided or Quick. Guided explains every step's rules in plain words, what each stat and skill does, and which stats your role relies on. "Explain the rules" switches it on part-way through any build.
- Sheet tips: guided runners show short tips on rolling, Improvement Points, wounds and saves, armor, combat and Humanity. Show tips / Hide tips works on any character.
- Deleting characters: a Delete button on each runner card, in the sheet's Notes tab, and Discard draft while building. To confirm, type the runner's handle (or DELETE for an unnamed draft). Deleted runners can still be restored from Backups → Recently deleted.

## 1.2.0
- New look: a Night City HUD style throughout. Near-black screens, coral-red hairlines and labels, cyan highlights for whatever is selected or active, and yellow for the main action on each screen.
- New HUD typefaces (Rajdhani and Share Tech Mono), bracket-cornered panels, faint scanlines, and page titles that boot in like a readout. The animation is skipped if Windows is set to reduce motion.
- Battle map restyled to match, with HUD corner marks around the map and new token and ruler lettering.
- Printed and PDF character sheets are unchanged: still clean black on white.

## 1.1.0
- The app now updates itself: each time it starts it checks GitHub for a newer version, downloads it, verifies it and installs it. Help → Check for updates does the same on demand.
- Source code and releases now live on GitHub.

## 1.0.0
- First desktop release: player characters, GM console, Owlbear-style battle map with fog of war, online play through Cloudflare, automatic backups, paper sheets and PDF export.
