css = open("D:/AI视频/website/css/style.css", "r", encoding="utf-8").read()

# Test read
print("Read", len(css), "chars")
print("Has body::after:", "body::after" in css)
print("Has section-divider:", "section-divider" in css)
