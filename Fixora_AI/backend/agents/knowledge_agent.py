def run(db, category: str):
    from backend.db.models import KnowledgeArticle
    articles = db.query(KnowledgeArticle).filter(
        KnowledgeArticle.category == category
    ).all()

    return [{
        "code": a.code,
        "title": a.title,
        "content": a.content,
        "steps": a.steps or [],
        "tools": a.tools or []
    } for a in articles]
