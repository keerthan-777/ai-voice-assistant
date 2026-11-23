
from models import BusinessFAQ


STOP_WORDS = {
    "what", "is", "are", "the", "a", "an", "do", "does",
    "you", "your", "i", "we", "to", "for", "of", "in",
    "and", "can", "could", "please", "tell", "me", "about",
    "how", "much", "many", "my"
}


def find_matching_faq(db, business_id: int, message: str):
    """
    Find the most relevant active FAQ for a business.
    """

    faqs = (
        db.query(BusinessFAQ)
        .filter(
            BusinessFAQ.business_id == business_id,
            BusinessFAQ.is_active == True
        )
        .all()
    )

    message_words = {
        word.strip(".,?!").lower()
        for word in message.split()
    } - STOP_WORDS

    if not message_words:
        return None

    best_faq = None
    best_score = 0

    for faq in faqs:
        question_words = {
            word.strip(".,?!").lower()
            for word in faq.question.split()
        } - STOP_WORDS

        if not question_words:
            continue

        matching_words = message_words.intersection(question_words)
        score = len(matching_words) / len(question_words)

        if score > best_score:
            best_score = score
            best_faq = faq

    # Require at least 50% keyword overlap
    if best_score >= 0.5:
        return best_faq

    return None

def is_business_question(message: str) -> bool:
    """
    Identify questions asking for business-specific information.
    """

    business_keywords = [
        "working hours",
        "opening hours",
        "closing time",
        "open",
        "closed",
        "timing",
        "location",
        "address",
        "where are",
        "where is",
        "services",
        "service",
        "facilities",
        "consultation fee",
        "price",
        "pricing",
        "cost",
        "charges",
        "payment",
        "discount",
        "offer",
        "available",
        "availability",
        "doctor",
        "clinic",
        "hospital",
        "contact number",
        "phone number",
        "email",
        "website",
        "do you provide",
        "do you offer",
        "do you accept"
    ]

    message = message.lower()

    return any(
        keyword in message
        for keyword in business_keywords
    )
