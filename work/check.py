css = open("D:/AI视频/website/css/style.css", "r", encoding="utf-8").read()

# Fix the divider margin in 480px responsive (it used to be 0 24px, let me check)
# Actually the `margin: 0 80px` replacement might have affected the responsive breakpoints too
# Let me check what we have
print("margin 80px count:", css.count("margin: 0 80px;"))
print("margin 32px count:", css.count("margin: 0 32px;"))

# Fix: the 480px breakpoint divider margin should be smaller than 80px
# Let me find and fix responsive divider margins
