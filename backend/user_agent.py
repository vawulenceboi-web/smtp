import random


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/125.0",
]

X_MAILERS = [
    "Thunderbird 115.0",
    "Apple Mail 16.0",
    "Outlook 16.0",
    "CustomMailer/1.0",
]


def random_user_agent() -> str:
    return random.choice(USER_AGENTS)


def random_x_mailer() -> str:
    return random.choice(X_MAILERS)

