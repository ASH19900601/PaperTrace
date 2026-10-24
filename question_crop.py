"""Locate a question part in original PDF coordinates; uncertain matches keep the page."""
import math
import re
import unicodedata

STOP = set('the a an of to in on at is are was be and or for from with by as it this that shown fig figure calculate determine state explain'.split())


def words(text):
    text = unicodedata.normalize('NFKC', text).lower()
    return {w for w in re.findall(r'[a-z]{3,}|\d+(?:\.\d+)?|[\u3400-\u9fff]{2,}', text) if w not in STOP}


def page_rows(page):
    rows = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = line['spans']
            text = ''.join(s['text'] for s in spans).strip()
            x0, y0, x1, y1 = line['bbox']
            if (not text or line.get('dir', (1, 0))[0] < .9 or
                    max((s['size'] for s in spans), default=0) < 7.5 or
                    y0 < 52 or y1 > page.rect.height - 45 or x0 < 23 or
                    re.search(r'UCLES|DO NOT WRITE|Turn over|BLANK PAGE|\d{4}/\d\d/[A-Z]/', text, re.I)):
                continue
            rows.append({'text': text, 'box': [x0, y0, x1, y1]})
    # Question numbers and part markers are often separate PDF text runs.
    merged = []
    for row in sorted(rows, key=lambda r: (round(r['box'][1] / 3), r['box'][0])):
        if merged and abs(merged[-1]['box'][1] - row['box'][1]) < 3:
            prev = merged[-1]
            prev['text'] += ' ' + row['text']
            prev['box'] = [min(prev['box'][0], row['box'][0]), min(prev['box'][1], row['box'][1]),
                           max(prev['box'][2], row['box'][2]), max(prev['box'][3], row['box'][3])]
        else:
            merged.append(row.copy())
    return merged


def locate_part(document, record, query, requested_page=None, full=False):
    first, last = record['page'], record.get('endPage', record['page'])
    page_numbers = list(range(first, min(last, len(document)) + 1))
    requested_page = requested_page if requested_page in page_numbers else None
    fallback = {'mode': 'page', 'label': '', 'page': requested_page or first, 'pages': page_numbers, 'clip': None}
    if not page_numbers:
        return fallback
    rows = []
    for number in page_numbers:
        rows.extend(dict(r, page=number) for r in page_rows(document[number - 1]))
    if not rows:
        return fallback
    q = record.get('question')
    start, end = 0, len(rows)
    root_found = False
    if q is not None:
        for i, row in enumerate(rows):
            match = re.match(r'^(\d{1,2})(?:[.)]\s|\s|$)', row['text'])
            if match and row['box'][0] <= 72:
                if int(match[1]) == q and row['page'] == first:
                    start, root_found = i, True
                elif int(match[1]) == q + 1:
                    end = i
                    break
    boundary = rows[end] if end < len(rows) else None
    rows = rows[start:end]
    if not rows:
        return fallback
    actual_pages = sorted({r['page'] for r in rows})
    fallback.update(pages=actual_pages, page=requested_page if requested_page in actual_pages else actual_pages[0])
    if full:
        return fallback
    nodes = []
    if root_found:
        nodes.append({'label': str(q), 'level': 0, 'start': 0, 'stop': len(rows)})
    parent = ''
    parent_x = 0
    for i, row in enumerate(rows):
        text = re.sub(r'^' + str(q) + r'\s+', '', row['text']) if q else row['text']
        matches = list(re.finditer(r'\(([a-z]|ii|iii|iv|vi|vii|viii|ix|xi|xii)\)', text))
        if not matches or matches[0].start() > 1 or row['box'][0] > 155:
            continue
        for match in matches[:2]:
            if text[:match.start()].strip() and not re.fullmatch(r'\([a-z]\)', text[:match.start()].strip()):
                break
            marker = match[1]
            roman = len(marker) > 1 or (marker in 'ivx' and parent and (row['box'][0] > parent_x + 8 or match.start() > 0))
            if roman:
                if not parent:
                    continue
                label, level = parent + '(' + marker + ')', 2
            else:
                parent, parent_x = (str(q) if q else '') + '(' + marker + ')', max(65, row['box'][0])
                label, level = parent, 1
            nodes.append({'label': label, 'level': level, 'start': i, 'stop': len(rows)})
    for i, node in enumerate(nodes):
        for other in nodes[i + 1:]:
            if other['level'] <= node['level']:
                node['stop'] = other['start']
                break
    query_words = words(query)
    ranked = []
    reference = re.search(r'(?:\bQ(?:uestion)?\s*)' + str(q) + r'\s*((?:\([a-zivx]+\)\s*)*)', query, re.I) if q else None
    reference_label = str(q) + re.sub(r'\s+', '', reference[1]).lower() if reference else None
    for node in nodes:
        text = ' '.join(r['text'] for r in rows[node['start']:node['stop']])
        terms = words(text)
        common = query_words & terms
        coverage = len(common) / max(1, len(query_words))
        density = len(common) / max(1, len(terms))
        normalized_query = re.sub(r'\W+', ' ', query.lower()).strip()
        normalized_text = re.sub(r'\W+', ' ', text.lower()).strip()
        exact_short = len(query_words) >= 2 and ((density > .8 and coverage > .8) or
                       (len(normalized_query) >= 20 and normalized_query in normalized_text))
        if reference_label == node['label']:
            score = 2
        elif (len(common) >= 4 and coverage >= .32) or (len(common) >= 8 and density >= .65) or exact_short:
            score = coverage * .8 + density * .2
        else:
            continue
        ranked.append((score, node))
    if not ranked:
        return fallback
    ranked.sort(key=lambda item: item[0], reverse=True)
    score, chosen = ranked[0]
    # Competing sibling parts with almost equal evidence should not be guessed.
    if len(ranked) > 1 and score < 2:
        next_score, other = ranked[1]
        nested = ((chosen['start'] <= other['start'] and chosen['stop'] >= other['stop']) or
                  (other['start'] <= chosen['start'] and other['stop'] >= chosen['stop']))
        if score - next_score < .035 and not nested:
            return fallback
    selected = rows[chosen['start']:chosen['stop']]
    pages = sorted({r['page'] for r in selected})
    page_number = requested_page if requested_page in pages else pages[0]
    page = document[page_number - 1]
    visible = [r for r in selected if r['page'] == page_number]
    y0 = min(r['box'][1] for r in visible) - 8
    limit = page.rect.height - 48
    if chosen['stop'] < len(rows) and rows[chosen['stop']]['page'] == page_number:
        limit = rows[chosen['stop']]['box'][1] - 7
    elif boundary and boundary['page'] == page_number:
        limit = boundary['box'][1] - 7
    y1 = max(r['box'][3] for r in visible) + 10
    # Include diagrams and answer rules belonging to this part.
    graphics = [d['rect'] for d in page.get_drawings()]
    graphics += [info['bbox'] for info in page.get_image_info()]
    for box in graphics:
        x0, gy0, x1, gy1 = box
        if gy0 >= y0 and gy1 <= limit and x1 - x0 > 5:
            y1 = max(y1, gy1 + 8)
    clip = [24, max(50, y0), page.rect.width - 24, min(limit, y1)]
    if not all(math.isfinite(v) for v in clip) or clip[3] - clip[1] < 18:
        return fallback
    return {'mode': 'part' if chosen['level'] else 'question', 'label': chosen['label'],
            'page': page_number, 'pages': pages, 'clip': [round(v, 1) for v in clip]}
