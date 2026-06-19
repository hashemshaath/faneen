import re
import os

app_tsx = open('src/App.tsx').read()
routes = re.findall(r'path="([^"]+)"', app_tsx)
routes = set(routes)

print(f"Total routes in App.tsx: {len(routes)}")

sidebar_tsx = open('src/components/dashboard/DashboardSidebar.tsx').read()
sidebar_links = re.findall(r'url: "([^"]+)"', sidebar_tsx)
sidebar_links += re.findall(r"url: '([^']+)'", sidebar_tsx)

admin_nav = open('src/modules/admin-shell/navigation/adminNavigation.ts').read()
admin_links = re.findall(r'route: "([^"]+)"', admin_nav)
admin_links += re.findall(r"route: '([^']+)'", admin_nav)

all_nav_links = set(sidebar_links + admin_links)

missing_routes = []
for link in all_nav_links:
    # Handle dynamic routes like /admin/users/:id
    base_link = link.split('?')[0]
    matched = False
    for route in routes:
        if route == base_link:
            matched = True
            break
        # Very simple regex match for params
        pattern = "^" + re.sub(r':\w+', r'[^/]+', route) + "$"
        if re.match(pattern, base_link):
            matched = True
            break
    if not matched:
        missing_routes.append(link)

print("Nav links without matching route in App.tsx:")
for r in sorted(missing_routes):
    print(f"  {r}")
