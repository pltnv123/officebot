#!/usr/bin/env python3
"""
Parse agency-agents .md files → generate Russian descriptions → send to Telegram.
"""
import os, json, re, time, urllib.request, sys

BOT_TOKEN = "8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs"
GROUP_ID = "-1003780060338"
AGENTS_DIR = "/home/antonbot/.openclaw/workspace/office/agents/agency"

DIVISIONS = [
    ("eng-", 32, "Engineering", "⚙️"),
    ("design-", 33, "Design", "🎨"),
    ("gamedev-", 34, "Game Dev", "🎮"),
    ("mkt-", 35, "Marketing", "📢"),
    ("pm-", 36, "Paid Media", "💰"),
    ("sales-", 37, "Sales", "💼"),
    ("prod-", 38, "Product", "📦"),
    ("pmgmt-", 39, "Project Management", "📋"),
    ("test-", 40, "Testing", "🔍"),
]

def parse_agent_file(filepath):
    """Parse an agent md file extracting frontmatter and sections."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = {"name": "", "description": "", "emoji": "", "role": "", 
              "personality": "", "capabilities": [], "deliverables": [], 
              "scenarios": [], "identity": ""}
    
    # Parse YAML frontmatter
    fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if fm_match:
        fm = fm_match.group(1)
        for line in fm.split('\n'):
            if line.startswith('name:'):
                result["name"] = line[5:].strip().strip('"').strip("'")
            elif line.startswith('description:'):
                result["description"] = line[12:].strip().strip('"').strip("'")
            elif line.startswith('emoji:'):
                result["emoji"] = line[6:].strip()
    
    # Get first heading as name fallback
    if not result["name"]:
        h1 = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
        if h1:
            result["name"] = h1.group(1).strip().replace("Agent Personality", "").strip()
    
    # Extract intro paragraph (first paragraph after # heading)
    lines = content.split('\n')
    intro_started = False
    intro_lines = []
    for line in lines:
        s = line.strip()
        if s.startswith('# ') and not intro_started:
            intro_started = True
            continue
        if intro_started:
            if s.startswith('## '):
                break
            if s and not s.startswith('*') and not s.startswith('-') and not s.startswith('>') and not s.startswith('You are'):
                intro_lines.append(s)
                if len(intro_lines) >= 2:
                    break
            elif s == '' and intro_lines:
                break
    result["identity"] = ' '.join(intro_lines)[:400]
    
    # Extract sections
    current_section = None
    section_content = []
    
    for line in lines:
        s = line.strip()
        
        if s.startswith('## ') or s.startswith('### '):
            # Save previous section
            if current_section and section_content:
                save_section(result, current_section, section_content)
            section_content = []
            
            lower = s.lower()
            if 'identity' in lower or 'role' in lower:
                current_section = 'identity'
            elif 'mission' in lower or 'core' in lower or 'responsib' in lower:
                current_section = 'capabilities'
            elif 'deliverable' in lower or 'output' in lower or 'result' in lower:
                current_section = 'deliverables'
            elif 'when' in lower or 'trigger' in lower or 'scenario' in lower or 'use case' in lower:
                current_section = 'scenarios'
            elif 'critical' in lower or 'rule' in lower or 'guideline' in lower:
                current_section = 'rules'
            else:
                current_section = None
            continue
        
        if current_section:
            # Extract bullet points or sub-items
            if s.startswith('- **'):
                # Bold bullet: "- **Role**: text"
                m = re.match(r'-\s+\*\*([^*]+)\*\*[:\s]*(.*)', s)
                if m:
                    key = m.group(1).strip()
                    val = m.group(2).strip()
                    if key.lower() in ['role', 'personality', 'experience', 'memory']:
                        if key.lower() == 'role':
                            result["role"] = val
                        elif key.lower() == 'personality':
                            result["personality"] = val
                    elif val:
                        section_content.append(f"{key}: {val}")
            elif s.startswith(('- ', '* ', '• ')):
                item = re.sub(r'^[-*•]\s+', '', s)
                item = re.sub(r'\*\*([^*]+)\*\*', r'\1', item)
                item = re.sub(r'\*([^*]+)\*', r'\1', item)
                item = re.sub(r'`([^`]+)`', r'\1', item)
                if item and not item.startswith('```') and len(item) > 3:
                    section_content.append(item)
    
    if current_section and section_content:
        save_section(result, current_section, section_content)
    
    return result

def save_section(result, section, content):
    if section in result and isinstance(result[section], list):
        result[section].extend(content)

def translate_capability(cap):
    """Translate and simplify a capability to Russian."""
    # Simple keyword-based translation for common patterns
    cap_lower = cap.lower()
    
    translations = {
        'react': 'Создание интерфейсов на React',
        'vue': 'Разработка на Vue.js',
        'angular': 'Работа с Angular',
        'component': 'Создание компонентов',
        'design system': 'Построение дизайн-систем',
        'responsive': 'Адаптивная вёрстка под все устройства',
        'accessibility': 'Доступность для всех пользователей',
        'performance': 'Оптимизация производительности',
        'api': 'Интеграция с API сервисами',
        'database': 'Работа с базами данных',
        'security': 'Обеспечение безопасности',
        'testing': 'Написание тестов',
        'deploy': 'Развёртывание приложений',
        'docker': 'Контейнеризация приложений',
        'cloud': 'Работа с облачными сервисами',
        'ci/cd': 'Настройка автоматического деплоя',
        'machine learning': 'Машинное обучение',
        'data pipeline': 'Построение потоков данных',
        'websocket': 'Работа с реальными данными в реальном времени',
        'auth': 'Системы авторизации и доступа',
    }
    
    for key, val in translations.items():
        if key in cap_lower:
            return val
    
    # If no translation found, return cleaned English (it's OK for technical terms)
    return cap[:100]

def generate_russian_agent(info, demoji, div_name, file_prefix):
    """Generate a beginner-friendly Russian description."""
    name = info["name"] or "Эксперт"
    emoji = info["emoji"] or demoji
    
    lines = []
    lines.append(f"<b>{emoji} {name}</b>")
    lines.append("")
    
    # What is this person
    lines.append("<b>Что это за специалист:</b>")
    desc = info.get("description", "") or info.get("identity", "")
    if not desc and info["role"]:
        desc = info["role"]
    if desc:
        # Simplify and translate
        desc = desc.replace("You are", "").replace("an expert", "").replace("Expert", "").strip()
        # Remove leading comma/dash
        desc = re.sub(r'^[,\-\s]+', '', desc)
        lines.append(desc[:250])
    else:
        # Generate from name
        role_map = {
            "eng-": "разработки программного обеспечения",
            "design-": "дизайна и визуального оформления",
            "gamedev-": "разработки игр",
            "mkt-": "маркетинга и продвижения",
            "pm-": "платной рекламы",
            "sales-": "продаж и работы с клиентами",
            "prod-": "управления продуктом",
            "pmgmt-": "управления проектами",
            "test-": "тестирования и контроля качества",
        }
        role_desc = role_map.get(file_prefix, "своей области")
        lines.append(f"Специалист в области {role_desc}. Помогает решать конкретные задачи в своей зоне ответственности.")
    lines.append("")
    
    # Capabilities
    caps = [c for c in info["capabilities"] if c and not c.startswith('```') and len(c) > 5][:6]
    if caps:
        lines.append("<b>Что он умеет:</b>")
        for c in caps[:5]:
            c_clean = re.sub(r'[:\-]\s*$', '', c).strip()
            if len(c_clean) > 130:
                c_clean = c_clean[:127] + "..."
            lines.append(f"• {c_clean}")
    lines.append("")
    
    # Scenarios
    scenarios = [s for s in info["scenarios"] if s and len(s) > 5][:5]
    if scenarios:
        lines.append("<b>Когда его вызывать:</b>")
        for s in scenarios[:4]:
            s = re.sub(r'[:\-]\s*$', '', s).strip()
            if len(s) > 130:
                s = s[:127] + "..."
            lines.append(f"• {s}")
    else:
        # Generate generic scenarios based on division
        generic = {
            "eng-": ["«Нужно добавить новую фичу в проект»", "«Что-то сломалось в продакшене»", "«Нужно ускорить работу системы»"],
            "design-": ["«Нужно обновить внешний вид продукта»", "«Пользователи жалуются что неудобно»", "«Нужен новый стиль для бренда»"],
            "gamedev-": ["«Нужно сделать новую игровую механику»", "«Игра тормозит на слабых устройствах»", "«Нужны новые уровни или персонажи»"],
            "mkt-": ["«Нужно привлечь больше клиентов»", "«Конкуренты обходят нас в поиске»", "«Запускаем новый продукт — нужна раскрутка»"],
            "pm-": ["«Реклама не окупается»", "«Нужно настроить таргетинг»", "«Хотим попробовать новую рекламную площадку»"],
            "sales-": ["«Сделки застревают и не закрываются»", "«Нужно увеличить конверсию»", "«Клиенты не отвечают на предложения»"],
            "prod-": ["«Не понимаем что делать дальше с продуктом»", "«Пользователи массово уходят»", "«Нужно расставить приоритеты в разработке»"],
            "pmgmt-": ["«Проект буксует и не двигается»", "«Команда не понимает кто за что отвечает»", "«Нужно выстроить процессы работы»"],
            "test-": ["«Пользователи находят баги в продакшене»", "«Нужно проверить новый релиз перед запуском»", "«Что-то работает нестабильно»"],
        }
        lines.append("<b>Когда его вызывать:</b>")
        for s in generic.get(file_prefix, ["«Есть задача в его области»"]):
            lines.append(f"• {s}")
    lines.append("")
    
    # Deliverables
    dels = [d for d in info["deliverables"] if d and not d.startswith('```') and len(d) > 5][:4]
    if dels:
        lines.append("<b>Что получишь на выходе:</b>")
        for d in dels[:3]:
            d = re.sub(r'[:\-]\s*$', '', d).strip()
            if len(d) > 130:
                d = d[:127] + "..."
            lines.append(f"• {d}")
    else:
        lines.append("<b>Что получишь на выходе:</b> Готовый результат который можно сразу использовать в работе")
    
    lines.append("")
    lines.append("—")
    return '\n'.join(lines)

def send_telegram(tid, text, retries=6):
    payload = json.dumps({
        "chat_id": GROUP_ID,
        "message_thread_id": tid,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }).encode('utf-8')
    
    for attempt in range(retries):
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read().decode())
                return result.get("ok", False)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = min(3 * (attempt + 1), 30)
                print(f"    [429] Retry in {wait}s...", flush=True)
                time.sleep(wait)
            else:
                body = e.read().decode()[:200] if e.fp else ""
                print(f"    [HTTP {e.code}] {body}", flush=True)
                time.sleep(3)
        except Exception as e:
            print(f"    [Error] {e}", flush=True)
            time.sleep(2)
    return False

def main():
    all_files = sorted([f for f in os.listdir(AGENTS_DIR) 
                        if f.endswith('.md') 
                        and any(f.startswith(p) for p,_,_,_ in DIVISIONS)])
    
    # Group by division
    divisions_map = {}
    for f in all_files:
        for prefix, tid, dname, demoji in DIVISIONS:
            if f.startswith(prefix):
                divisions_map.setdefault(prefix, []).append(f)
                break
    
    total = 0
    all_output = []
    
    for prefix, tid, dname, demoji in DIVISIONS:
        files = divisions_map.get(prefix, [])
        if not files:
            continue
        
        print(f"\n{'='*50}", flush=True)
        print(f"📁 {dname}: {len(files)} agents → topic {tid}", flush=True)
        print(f"{'='*50}", flush=True)
        
        # Send division header
        header = f"<b>🏛️ ДИВИЗИОН: {dname.upper()}</b>\n\nВсего агентов: {len(files)}\n👇 Подробное описание каждого:"
        print(f"  → Sending header...", flush=True)
        send_telegram(tid, header)
        time.sleep(2)
        
        div_descriptions = []
        batch = ""
        batch_count = 0
        
        for i, filename in enumerate(files):
            filepath = os.path.join(AGENTS_DIR, filename)
            info = parse_agent_file(filepath)
            desc = generate_russian_agent(info, demoji, dname, prefix)
            div_descriptions.append(desc)
            
            # Check if adding would exceed limit
            if len(batch) + len(desc) > 3500 and batch:
                print(f"  → Sending batch ({batch_count} agents)...", flush=True)
                ok = send_telegram(tid, batch)
                print(f"    {'✅ OK' if ok else '❌ FAIL'}", flush=True)
                time.sleep(3)
                batch = desc
                batch_count = 1
            else:
                if batch:
                    batch += "\n\n"
                batch += desc
                batch_count += 1
            
            total += 1
            print(f"  [{i+1}/{len(files)}] {info['name']}", flush=True)
        
        # Send remaining
        if batch.strip():
            print(f"  → Sending final batch ({batch_count} agents)...", flush=True)
            ok = send_telegram(tid, batch)
            print(f"    {'✅ OK' if ok else '❌ FAIL'}", flush=True)
            time.sleep(3)
        
        # Division summary
        send_telegram(tid, f"✅ Дивизион «{dname}» — {len(files)} агентов расписано!")
        time.sleep(2)
        
        all_output.append((dname, demoji, tid, div_descriptions))
    
    # Save to markdown file
    output_file = os.path.join(AGENTS_DIR, "ALL_AGENTS_DETAILED.md")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# Все 112 агентов Agency-Agents — подробное описание для чайников\n\n")
        f.write("**Источник:** https://github.com/msitarzewski/agency-agents\n")
        f.write(f"**Сгенерировано:** {time.strftime('%Y-%m-%d %H:%M UTC')}\n")
        f.write(f"**Всего агентов:** {total}\n\n---\n\n")
        for dname, demoji, tid, descs in all_output:
            f.write(f"## {demoji} {dname} (Telegram Topic {tid}) — {len(descs)} агентов\n\n")
            for d in descs:
                md = d.replace('<b>', '**').replace('</b>', '**')
                md = re.sub(r'«([^»]+)»', r'"\1"', md)
                f.write(md + "\n\n")
            f.write("---\n\n")
    
    print(f"\n{'='*50}", flush=True)
    print(f"🎉 ГОТОВО! Расписано агентов: {total}", flush=True)
    print(f"📄 Файл: {output_file}", flush=True)
    print(f"{'='*50}", flush=True)

if __name__ == "__main__":
    main()
