const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPT_RUNTIME_ROOT = ['backend', 'controlPlane', 'storage', '.first-governed-workflow-runtime', 'webstudio-script-artifacts'];
const FORBIDDEN_SNIPPETS = [
  'import subprocess',
  'import socket',
  'import requests',
  'urllib',
  'shutil',
  'eval(',
  'exec(',
  '__import__',
  ' pip ',
  ' install ',
];
const ALLOWED_IMPORTS = new Set(['csv', 'json', 're', 'sys', 'math', 'statistics', 'datetime', 'argparse', 'time']);

function normalizeBrief(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractQuotedText(brief) {
  const match = String(brief || '').match(/["""].+?[""""]/);
  return match ? match[0].replace(/[""""]/g, '').trim() : '';
}

function extractMessageAfterVerb(brief) {
  const match = String(brief || '').match(/(?:пишет|печатает|выводит|print(?:s)?)\s+(.+)$/i);
  return match ? match[1].replace(/[""""]/g, '').trim() : '';
}

function detectUnsafeReasons(brief) {
  const text = String(brief || '').toLowerCase();
  const reasons = [];
  if (/delete files|удаля.*файл|remove files|rm -rf|wipe/.test(text)) reasons.push('file_deletion');
  if (/http|https|api|socket|network|telegram|requests/.test(text)) reasons.push('network_or_external_api');
  if (/subprocess|os\.system|exec|eval|pip install|install package/.test(text)) reasons.push('unsafe_code_execution');
  if (/database|sql|postgres|mysql|sqlite/.test(text)) reasons.push('database_access');
  if (/token|credential|password|secret|key/.test(text)) reasons.push('credentials_or_secrets');
  if (/browser|selenium|playwright/.test(text)) reasons.push('browser_automation');
  return reasons;
}

function analyzeScriptScenario({ brief, tech_preference } = {}) {
  const normalizedBrief = normalizeBrief(brief);
  const lower = normalizedBrief.toLowerCase();
  const language = 'python';
  const safety_level = 'bounded_demo';
  const requestedTech = String(tech_preference || 'auto').toLowerCase();
  const unsafeReasons = detectUnsafeReasons(normalizedBrief);
  if (unsafeReasons.length > 0) {
    return {
      scenario: 'unsupported',
      language,
      safety_level,
      tech_preference: requestedTech === 'python' || requestedTech === 'auto' ? requestedTech : 'python',
      required_inputs: [],
      expected_outputs: [],
      unsupported_reasons: unsafeReasons,
      reason: 'unsupported_or_unsafe_script_scenario',
    };
  }

  const rangeMatch = normalizedBrief.match(/от\s+(\d+)\s+до\s+(\d+)/i);
  if (rangeMatch && /пишет|печатает|выводит|print/.test(lower)) {
    const quoted = extractQuotedText(normalizedBrief);
    const message = quoted || extractMessageAfterVerb(normalizedBrief) || 'Hello';
    const hasPause = /пауз|последовательно|по шаг|каждую секунду|sleep|delay/.test(lower);
    return {
      scenario: 'loop_print',
      language,
      safety_level,
      tech_preference: requestedTech,
      params: { start: Number(rangeMatch[1]), end: Number(rangeMatch[2]), message, hasPause },
      required_inputs: [],
      expected_outputs: ['stdout lines'],
    };
  }

  if (/пишет|печатает|выводит/.test(lower) && extractQuotedText(normalizedBrief)) {
    return {
      scenario: 'print_static_text',
      language,
      safety_level,
      tech_preference: requestedTech,
      params: { message: extractQuotedText(normalizedBrief) },
      required_inputs: [],
      expected_outputs: ['stdout text'],
    };
  }

  const sumRangeMatch = normalizedBrief.match(/сумм[ауы]?\s+от\s+(\d+)\s+до\s+(\d+)/i);
  if (sumRangeMatch) {
    return {
      scenario: 'arithmetic_sum_range',
      language,
      safety_level,
      tech_preference: requestedTech,
      params: { start: Number(sumRangeMatch[1]), end: Number(sumRangeMatch[2]) },
      required_inputs: [],
      expected_outputs: ['stdout sum'],
    };
  }

  const tableMatch = normalizedBrief.match(/таблиц[ауы]?\s+умножения\s+на\s+(\d+)/i);
  if (tableMatch) {
    return {
      scenario: 'multiplication_table',
      language,
      safety_level,
      tech_preference: requestedTech,
      params: { number: Number(tableMatch[1]) },
      required_inputs: [],
      expected_outputs: ['stdout multiplication table'],
    };
  }

  if ((/csv|таблиц|колонк|amount/.test(lower)) && !/json/.test(lower)) {
    return { scenario: 'csv_summary', language, safety_level, tech_preference: requestedTech, required_inputs: ['sample_input.csv'], expected_outputs: ['stdout total summary'] };
  }
  if (/лишн.*пробел|очистк.*текст|нормализ|normalize|clean text|text cleaner/.test(lower)) {
    return { scenario: 'text_cleaner', language, safety_level, tech_preference: requestedTech, required_inputs: ['sample_input.txt'], expected_outputs: ['stdout normalized text'] };
  }
  if (/json/.test(lower) && /email|emails|почт/.test(lower)) {
    return { scenario: 'json_extractor', language, safety_level, tech_preference: requestedTech, required_inputs: ['sample_input.json'], expected_outputs: ['stdout extracted emails'] };
  }
  if (/пишет|печатает|выводит|считает сумму|таблица умножения|count|посчитать количество|list/.test(lower)) {
    return {
      scenario: 'general_safe_python',
      language,
      safety_level,
      tech_preference: requestedTech,
      required_inputs: [],
      expected_outputs: ['stdout result'],
    };
  }

  return {
    scenario: 'unsupported',
    language,
    safety_level,
    tech_preference: requestedTech,
    required_inputs: [],
    expected_outputs: [],
    unsupported_reasons: ['no_safe_template_match'],
    reason: 'unsupported_or_unsafe_script_scenario',
  };
}

function buildScenarioSpec({ orderId, brief, scenario, params = {} }) {
  const commonHeader = `Order ID: ${orderId}\nScenario: ${scenario}\nBrief: ${brief}\n`;
  
  if (scenario === 'csv_summary') {
    return {
      artifact_id: `ws-script-artifact-${orderId}-csv-summary`,
      inputFileName: 'sample_input.csv',
      files: {
        'script.py': `import argparse
import csv
import sys

def parse_args():
    parser = argparse.ArgumentParser(description='Summarizes a CSV column (default: amount).')
    parser.add_argument('input_csv', help='Input CSV file path')
    parser.add_argument('--column', default='amount', help='Column name to sum (default: amount)')
    return parser.parse_args()

def parse_decimal(value):
    """Handle both dot and comma as decimal separator."""
    value = value.strip().replace(',', '.')
    try:
        return float(value)
    except ValueError:
        return None

def main():
    args = parse_args()
    try:
        with open(args.input_csv, 'r', encoding='utf-8', newline='') as f:
            reader = csv.DictReader(f)
            if args.column not in reader.fieldnames:
                raise SystemExit(f'Error: column "{args.column}" not found. Available: {reader.fieldnames}')
            total = 0.0
            rows = 0
            counted = 0
            for row in reader:
                rows += 1
                val = parse_decimal(row.get(args.column, ''))
                if val is not None:
                    total += val
                    counted += 1
            print(f'amount_sum={int(total) if total.is_integer() else f"{total:.2f}"}')
            print(f'rows_processed={rows}')
            print(f'values_counted={counted}')
    except FileNotFoundError:
        raise SystemExit(f'Error: file not found: {args.input_csv}')
    except Exception as e:
        raise SystemExit(f'Error: {e}')

if __name__ == '__main__':
    main()
`,
        'README.md': `# Script MVP Package

${commonHeader}
Reads a CSV and computes sum of a numeric column (default: amount).
Handles decimal comma (e.g., "10,50" → 10.50).

Run:
\`\`\`bash
python3 script.py sample_input.csv --column amount
\`\`\`

Expected output:
\`\`\`
amount_sum=250
rows_processed=3
values_counted=3
\`\`\`
`,
        'sample_input.csv': 'lead_id,amount,status\n101,120,new\n102,80,qualified\n103,50,won\n',
        'sample_output.txt': 'amount_sum=250\nrows_processed=3\nvalues_counted=3\n',
      },
      manifestExtras: { params: {} },
    };
  }
  
  if (scenario === 'text_cleaner') {
    return {
      artifact_id: `ws-script-artifact-${orderId}-text-cleaner`,
      inputFileName: 'sample_input.txt',
      files: {
        'script.py': `import argparse
import sys

def parse_args():
    parser = argparse.ArgumentParser(description='Normalizes whitespace in text.')
    parser.add_argument('input_txt', nargs='?', default=None, help='Input text file (optional, reads stdin if omitted)')
    return parser.parse_args()

def normalize_line(line):
    """Strip leading/trailing whitespace and collapse internal spaces."""
    return ' '.join(line.strip().split())

def main():
    args = parse_args()
    lines = []
    if args.input_txt:
        try:
            with open(args.input_txt, 'r', encoding='utf-8') as f:
                lines = [normalize_line(l) for l in f.readlines()]
        except FileNotFoundError:
            raise SystemExit(f'Error: file not found: {args.input_txt}')
    else:
        for line in sys.stdin:
            lines.append(normalize_line(line))
    # Remove empty lines
    output = [l for l in lines if l]
    print('\\n'.join(output))

if __name__ == '__main__':
    main()
`,
        'README.md': `# Script MVP Package

${commonHeader}
Normalizes extra spaces and removes empty lines.

Run:
\`\`\`bash
python3 script.py sample_input.txt
\`\`\`

Or via stdin:
\`\`\`bash
cat sample_input.txt | python3 script.py
\`\`\`
`,
        'sample_input.txt': '  Hello    world   \n\nThis    is    a   test\n  \n',
        'sample_output.txt': 'Hello world\nThis is a test\n',
      },
      manifestExtras: { params: {} },
    };
  }
  
  if (scenario === 'json_extractor') {
    return {
      artifact_id: `ws-script-artifact-${orderId}-json-extractor`,
      inputFileName: 'sample_input.json',
      files: {
        'script.py': `import argparse
import json
import sys

def parse_args():
    parser = argparse.ArgumentParser(description='Extracts emails from JSON.')
    parser.add_argument('input_json', help='Input JSON file path')
    parser.add_argument('--key', default='email', help='Key to search for (default: email)')
    return parser.parse_args()

def walk(value, key):
    """Recursively walk JSON and yield values matching key."""
    if isinstance(value, dict):
        for k, v in value.items():
            if k == key and isinstance(v, str) and '@' in v:
                yield v
            yield from walk(v, key)
    elif isinstance(value, list):
        for item in value:
            yield from walk(item, key)

def main():
    args = parse_args()
    try:
        with open(args.input_json, 'r', encoding='utf-8') as f:
            payload = json.load(f)
    except FileNotFoundError:
        raise SystemExit(f'Error: file not found: {args.input_json}')
    except json.JSONDecodeError as e:
        raise SystemExit(f'Error: invalid JSON: {e}')
    
    emails = sorted(dict.fromkeys(walk(payload, args.key)))
    if not emails:
        raise SystemExit(f'No emails found with key "{args.key}"')
    print('\\n'.join(emails))

if __name__ == '__main__':
    main()
`,
        'README.md': `# Script MVP Package

${commonHeader}
Extracts email addresses from JSON by recursive walk.

Run:
\`\`\`bash
python3 script.py sample_input.json --key email
\`\`\`
`,
        'sample_input.json': '{\n  "leads": [\n    {"name": "Anna", "email": "anna@example.com"},\n    {"name": "Bob", "contacts": {"primary": "bob@example.com"}}\n  ],\n  "meta": {"owner_email": "ops@example.com"}\n}\n',
        'sample_output.txt': 'anna@example.com\nbob@example.com\nops@example.com\n',
      },
      manifestExtras: { params: {} },
    };
  }
  
  if (scenario === 'loop_print') {
    const start = Number(params.start || 1);
    const end = Number(params.end || 5);
    const message = String(params.message || 'Hello');
    const hasPause = params.hasPause || false;
    const lines = Array.from({ length: end - start + 1 }, (_, idx) => `${start + idx} ${message}`).join('\n') + '\n';
    
    const scriptContent = hasPause
      ? `import argparse
import time

def parse_args():
    parser = argparse.ArgumentParser(description='Prints a message for each integer in range with optional delay.')
    parser.add_argument('--start', type=int, default=${start}, help='Start value')
    parser.add_argument('--end', type=int, default=${end}, help='End value')
    parser.add_argument('--message', type=str, default=${JSON.stringify(message)}, help='Message to print')
    parser.add_argument('--delay', type=float, default=0.5, help='Delay between prints in seconds')
    return parser.parse_args()

def run_sequence(start, end, message, delay):
    for i in range(start, end + 1):
        print(f"{i} {message}", flush=True)
        time.sleep(delay)

def main():
    args = parse_args()
    run_sequence(args.start, args.end, args.message, args.delay)

if __name__ == '__main__':
    main()
`
      : `import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Prints a message for each integer in range.')
    parser.add_argument('--start', type=int, default=${start}, help='Start value')
    parser.add_argument('--end', type=int, default=${end}, help='End value')
    parser.add_argument('--message', type=str, default=${JSON.stringify(message)}, help='Message to print')
    return parser.parse_args()

def main():
    args = parse_args()
    for i in range(args.start, args.end + 1):
        print(f"{i} {args.message}", flush=True)

if __name__ == '__main__':
    main()
`;
    
    return {
      artifact_id: `ws-script-artifact-${orderId}-loop-print`,
      inputFileName: null,
      files: {
        'script.py': scriptContent,
        'README.md': `# Script MVP Package

${commonHeader}
Prints a message for each integer in range ${start}..${end}${hasPause ? ' with delay between prints' : ''}.

Run:
\`\`\`bash
python3 script.py
\`\`\`

With custom args:
\`\`\`bash
python3 script.py --start ${start} --end ${end} --message "${message.replace(/"/g, '\\"')}"${hasPause ? ' --delay 0.5' : ''}
\`\`\`

Expected output:
${lines}`,
        'sample_output.txt': lines,
      },
      manifestExtras: { params: { start, end, message, hasPause } },
    };
  }
  
  if (scenario === 'print_static_text' || scenario === 'general_safe_python') {
    const message = String(params.message || extractQuotedText(brief) || 'Hello WebStudio');
    return {
      artifact_id: `ws-script-artifact-${orderId}-print-static-text`,
      inputFileName: null,
      files: {
        'script.py': `import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Prints static text.')
    parser.add_argument('--message', type=str, default=${JSON.stringify(message)}, help='Message to print')
    return parser.parse_args()

def main():
    args = parse_args()
    print(args.message)

if __name__ == '__main__':
    main()
`,
        'README.md': `# Script MVP Package

${commonHeader}
Prints static text to stdout.

Run:
\`\`\`bash
python3 script.py --message "${message.replace(/"/g, '\\"')}"
\`\`\`
`,
        'sample_output.txt': `${message}\n`,
      },
      manifestExtras: { params: { message }, normalized_general_scenario: 'print_static_text' },
    };
  }
  
  if (scenario === 'arithmetic_sum_range') {
    const start = Number(params.start || 1);
    const end = Number(params.end || 100);
    const sum = ((start + end) * (end - start + 1)) / 2;
    return {
      artifact_id: `ws-script-artifact-${orderId}-sum-range`,
      inputFileName: null,
      files: {
        'script.py': `import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Calculates sum of integers in a range.')
    parser.add_argument('--start', type=int, default=${start}, help='Start value')
    parser.add_argument('--end', type=int, default=${end}, help='End value')
    return parser.parse_args()

def main():
    args = parse_args()
    if args.start > args.end:
        raise SystemExit('Error: start must be <= end')
    total = sum(range(args.start, args.end + 1))
    formula = f"({args.start} + {args.end}) * {args.end - args.start + 1} / 2"
    print(f"range_sum={total}")
    print(f"formula={formula}")

if __name__ == '__main__':
    main()
`,
        'README.md': `# Script MVP Package

${commonHeader}
Calculates the sum from ${start} to ${end}.

Run:
\`\`\`bash
python3 script.py
\`\`\`

With custom args:
\`\`\`bash
python3 script.py --start ${start} --end ${end}
\`\`\`

Expected output:
range_sum=${sum}
formula=(${start} + ${end}) * ${end - start + 1} / 2
`,
        'sample_output.txt': `range_sum=${sum}\nformula=(${start} + ${end}) * ${end - start + 1} / 2\n`,
      },
      manifestExtras: { params: { start, end } },
    };
  }
  
  if (scenario === 'multiplication_table') {
    const number = Number(params.number || 7);
    const output = Array.from({ length: 10 }, (_, idx) => `${number} x ${idx + 1} = ${number * (idx + 1)}`).join('\n') + '\n';
    return {
      artifact_id: `ws-script-artifact-${orderId}-multiplication-table`,
      inputFileName: null,
      files: {
        'script.py': `import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Prints multiplication table.')
    parser.add_argument('--number', type=int, default=${number}, help='Number for table')
    parser.add_argument('--to', type=int, default=10, help='Multiply up to (default: 10)')
    return parser.parse_args()

def main():
    args = parse_args()
    if args.number <= 0:
        raise SystemExit('Error: number must be positive')
    if args.to <= 0:
        raise SystemExit('Error: --to must be positive')
    for i in range(1, args.to + 1):
        print(f"{args.number} x {i} = {args.number * i}")

if __name__ == '__main__':
    main()
`,
        'README.md': `# Script MVP Package

${commonHeader}
Prints multiplication table for ${number}.

Run:
\`\`\`bash
python3 script.py --number ${number} --to 10
\`\`\`

Expected output:
${output}`,
        'sample_output.txt': output,
      },
      manifestExtras: { params: { number } },
    };
  }
  
  return null;
}

function fixMultiplicationScript(spec) {
  if (!spec || !spec.artifact_id || !String(spec.artifact_id).includes('multiplication-table')) return spec;
  const number = spec.manifestExtras?.params?.number || 7;
  spec.files['script.py'] = `import argparse

def parse_args():
    parser = argparse.ArgumentParser(description='Prints multiplication table.')
    parser.add_argument('--number', type=int, default=${number}, help='Number for table')
    parser.add_argument('--to', type=int, default=10, help='Multiply up to (default: 10)')
    return parser.parse_args()

def main():
    args = parse_args()
    if args.number <= 0:
        raise SystemExit('Error: number must be positive')
    if args.to <= 0:
        raise SystemExit('Error: --to must be positive')
    for i in range(1, args.to + 1):
        print(f"{args.number} x {i} = {args.number * i}")

if __name__ == '__main__':
    main()
`;
  return spec;
}

async function ensureDir(dirPath) { await fs.mkdir(dirPath, { recursive: true }); }

async function validateGeneratedPythonScript(source, artifactRoot) {
  for (const snippet of FORBIDDEN_SNIPPETS) {
    if (source.includes(snippet)) throw new Error(`Forbidden Python snippet detected: ${snippet}`);
  }
  const importMatches = source.match(/^import\s+([a-zA-Z0-9_]+)$/gm) || [];
  for (const line of importMatches) {
    const mod = line.replace(/^import\s+/, '').trim();
    if (!ALLOWED_IMPORTS.has(mod)) throw new Error(`Disallowed import: ${mod}`);
  }
  const tmpPath = path.join(artifactRoot, '__validation__.py');
  await fs.writeFile(tmpPath, source, 'utf8');
  await new Promise((resolve, reject) => {
    const child = spawn('python3', ['-m', 'py_compile', '__validation__.py'], { cwd: artifactRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr || `py_compile failed with code ${code}`)));
    child.on('error', reject);
  });
  await fs.rm(tmpPath, { force: true });
  const pycDir = path.join(artifactRoot, '__pycache__');
  await fs.rm(pycDir, { recursive: true, force: true });
}

async function createScriptExecutionPackage({ rootDir, orderId, brief, scenario, analysis = {} }) {
  let spec = buildScenarioSpec({ orderId, brief, scenario, params: analysis.params || {} });
  spec = fixMultiplicationScript(spec);
  if (!spec) throw new Error(`Unsupported scenario: ${scenario}`);
  const artifactRoot = path.join(rootDir, ...SCRIPT_RUNTIME_ROOT, orderId);
  await ensureDir(artifactRoot);
  await validateGeneratedPythonScript(spec.files['script.py'], artifactRoot);
  for (const [fileName, content] of Object.entries(spec.files)) {
    await fs.writeFile(path.join(artifactRoot, fileName), content, 'utf8');
  }
  await fs.writeFile(path.join(artifactRoot, 'test_run.log'), 'Pending test run\n', 'utf8');
  const manifest = {
    order_id: orderId,
    artifact_id: spec.artifact_id,
    project_type: 'script',
    scenario,
    brief,
    language: 'python',
    safety_level: 'bounded_demo',
    artifact_root: artifactRoot,
    files: Object.keys(spec.files).concat(['actual_output.txt', 'test_run.log', 'manifest.json']),
    generated_at: new Date().toISOString(),
    ...spec.manifestExtras,
  };
  await fs.writeFile(path.join(artifactRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return { artifact_id: spec.artifact_id, artifact_root: artifactRoot, input_file_name: spec.inputFileName, manifest };
}

async function runScriptSmoke({ artifactRoot, inputFileName }) {
  const args = ['script.py'];
  if (inputFileName) args.push(inputFileName);
  const command = `python3 ${args.join(' ')}`;
  const actualOutputPath = path.join(artifactRoot, 'actual_output.txt');
  const sampleOutputPath = path.join(artifactRoot, 'sample_output.txt');
  const logPath = path.join(artifactRoot, 'test_run.log');
  const expectedOutput = await fs.readFile(sampleOutputPath, 'utf8');
  const result = await new Promise((resolve, reject) => {
    const child = spawn('python3', args, { cwd: artifactRoot, stdio: ['ignore', 'pipe', 'pipe'], env: {} });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('script smoke timeout'));
    }, 5000);
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    child.on('exit', (code) => { clearTimeout(timeout); resolve({ stdout, stderr, code }); });
  });
  await fs.writeFile(actualOutputPath, result.stdout, 'utf8');
  const ok = result.code === 0 && result.stdout === expectedOutput;
  const log = [`command=${command}`, `exit_code=${result.code}`, `match_expected=${ok}`, `stderr=${result.stderr.trim()}`].join('\n') + '\n';
  await fs.writeFile(logPath, log, 'utf8');
  return { ok, command, exit_code: result.code, match_expected: ok, actual_output_path: actualOutputPath, sample_output_path: sampleOutputPath, test_run_log_path: logPath };
}

module.exports = { analyzeScriptScenario, createScriptExecutionPackage, runScriptSmoke, validateGeneratedPythonScript, SCRIPT_RUNTIME_ROOT };
