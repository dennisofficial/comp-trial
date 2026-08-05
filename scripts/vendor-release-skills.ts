import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { z } from 'zod';

// context-mill builds its skills into release assets rather than committing them, so
// `skills-lock.json` cannot describe them — `skills experimental_install` would try to
// clone a SKILL.md path that does not exist and fail the whole restore. These skills are
// committed instead; this script only re-fetches and verifies them.

const SKILLS_DIR = '.agents/skills';
const AGENT_DIR = '.claude/skills';

const sourceSchema = z.object({
  source: z.string(),
  sourceType: z.literal('github-release-asset'),
  release: z.string(),
  asset: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

type VendoredSkill = z.infer<typeof sourceSchema> & { name: string };

const readVendoredSkills = (): VendoredSkill[] =>
  readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const sourceFile = join(SKILLS_DIR, entry.name, '.source.json');
      if (!existsSync(sourceFile)) return [];

      const parsed = sourceSchema.safeParse(JSON.parse(readFileSync(sourceFile, 'utf8')));
      if (!parsed.success) throw new Error(`${sourceFile}: ${parsed.error.message}`);

      return [{ ...parsed.data, name: entry.name }];
    });

const downloadAsset = async ({ source, release, asset }: VendoredSkill): Promise<Buffer> => {
  const url = `https://github.com/${source}/releases/download/${release}/${asset}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → ${response.status} ${response.statusText}`);

  return Buffer.from(await response.arrayBuffer());
};

const relink = ({ name }: VendoredSkill) => {
  mkdirSync(AGENT_DIR, { recursive: true });

  const link = join(AGENT_DIR, name);
  rmSync(link, { force: true, recursive: true });
  symlinkSync(relative(AGENT_DIR, join(SKILLS_DIR, name)), link);
};

const write = process.argv.includes('--write');
const skills = readVendoredSkills();

if (skills.length === 0) {
  console.log(`no ${SKILLS_DIR}/*/.source.json entries — nothing to verify`);
  process.exit(0);
}

let failed = false;

for (const skill of skills) {
  const archive = await downloadAsset(skill);
  const digest = createHash('sha256').update(archive).digest('hex');

  if (digest !== skill.sha256) {
    console.error(
      `✗ ${skill.name}: ${skill.release}/${skill.asset} is ${digest}, expected ${skill.sha256}`,
    );
    failed = true;
    continue;
  }

  if (write) {
    const target = join(SKILLS_DIR, skill.name);
    const source = readFileSync(join(target, '.source.json'));

    rmSync(target, { force: true, recursive: true });
    mkdirSync(target, { recursive: true });

    // Bun ships no unzip binary; the system one is present on macOS and in the CI image.
    await Bun.write(join(target, skill.asset), archive);
    await Bun.$`unzip -q -o ${join(target, skill.asset)} -d ${target}`;
    rmSync(join(target, skill.asset));

    await Bun.write(join(target, '.source.json'), source);
    relink(skill);
  }

  console.log(`✓ ${skill.name} ${skill.release}`);
}

if (failed) {
  console.error(
    '\nA digest mismatch means upstream moved. Bump `release` and `sha256` in .source.json.',
  );
  process.exit(1);
}
