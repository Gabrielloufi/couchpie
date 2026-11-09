# Contributing to couchPie

Thank you for helping. Contributions are welcome in English and in Brazilian Portuguese:
code, documentation, translations, bug reports, and testing on hardware we don't have.

## Before you start

- **Small fixes** (a typo, a broken link, a clear bug): open a pull request directly.
- **Anything bigger** (a new module, a new game, a change in how something works): open an
  issue first and describe the idea. The project has a direction and a roadmap (see
  [GOVERNANCE.md](GOVERNANCE.md)), and agreeing early saves you work that might not be merged.

## License of your contribution

couchPie is licensed under the GNU Affero General Public License, version 3 or later
(`AGPL-3.0-or-later`). By contributing, you agree that your contribution is licensed under the
same terms. You keep the copyright to what you write.

## Sign your commits (DCO)

Every commit in a pull request must carry a sign-off line certifying the
[Developer Certificate of Origin 1.1](https://developercertificate.org/): in short, that you
wrote the change, or otherwise have the right to submit it under the project's license.

Git adds the line for you with `-s`:

```bash
git commit -s -m "Describe the change"
```

which adds, at the end of the message:

```
Signed-off-by: Your Name <your.email@example.com>
```

Use your real name (or the name you are publicly known by) and an email you can be reached at.
To sign off commits you already made: `git commit --amend -s` for the last one, or
`git rebase --signoff main` for all the commits on your branch.

## Code from elsewhere

- Don't copy code, images, fonts, sounds or text from other projects unless their license
  allows it and is compatible with AGPL-3.0-or-later. Say where it came from in the pull
  request, and add it to [THIRD_PARTY.md](THIRD_PARTY.md).
- Don't commit trademarks of other companies, such as streaming services' logos. The menu's
  logos are supplied by each user (see `modules/pegasus/menu/logos/`).
- Code written with the help of AI tools is fine, as long as you have checked it and can
  certify the DCO for it.

## Style

- Match the style of the files around your change. Documentation is written in plain,
  short sentences; each module's README explains what its files do and where they're
  installed.
- The TV interface is in Brazilian Portuguese; new user-facing features should work in both
  English and Brazilian Portuguese.
- Test on a real Raspberry Pi when you can, and say in the pull request what you tested on.

## Name and logo

The couchPie name and logo are covered by [TRADEMARKS.md](TRADEMARKS.md), not by the code's
license. Forks are welcome, under a different name.
