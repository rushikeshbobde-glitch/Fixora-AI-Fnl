import re


def run(db, category: str, issue_text: str = ""):
    from backend.db.models import KnowledgeArticle
    articles = db.query(KnowledgeArticle).all()

    query_tokens = set(re.findall(r"\w+", (issue_text or "").lower()))
    stop_words = {"the", "a", "an", "is", "my", "in", "to", "and", "or", "of", "it", "not", "cannot", "for", "with", "at"}
    query_tokens = query_tokens - stop_words

    scored = []
    for a in articles:
        score = 0
        if category and a.category == category:
            score += 10

        doc_text = f"{a.title} {a.content} {' '.join(a.steps or [])} {' '.join(a.tools or [])}".lower()
        for token in query_tokens:
            if token in doc_text:
                score += 3
            if token in a.title.lower():
                score += 5

        if score > 0 or a.category == category:
            scored.append((score, a))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for score, a in scored:
        results.append({
            "code": a.code,
            "title": a.title,
            "category": a.category,
            "content": a.content,
            "steps": a.steps or [],
            "tools": a.tools or [],
            "relevance_score": score
        })

    return results

