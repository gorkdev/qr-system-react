<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Sayfa Bulunamadı - 404</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #0f172a;
            color: #e5e7eb;
        }
        .card {
            padding: 2.5rem 2rem;
            border-radius: 1rem;
            background: rgba(15, 23, 42, 0.9);
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.8);
            text-align: center;
            max-width: 420px;
            width: 100%;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.15rem 0.6rem;
            border-radius: 999px;
            font-size: 0.7rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            background: rgba(248, 250, 252, 0.06);
            color: #38bdf8;
        }
        h1 {
            margin: 0.75rem 0 0.25rem;
            font-size: 1.8rem;
        }
        p {
            margin: 0.25rem 0;
            font-size: 0.9rem;
            color: #9ca3af;
        }
        a.button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 1.5rem;
            padding: 0.5rem 1.25rem;
            border-radius: 999px;
            font-size: 0.9rem;
            text-decoration: none;
            color: #0f172a;
            background: #38bdf8;
            font-weight: 500;
        }
        a.button:hover {
            background: #0ea5e9;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">HATA 404</div>
        <h1>Sayfa bulunamadı</h1>
        <p>Ulaşmaya çalıştığınız adres sistemde kayıtlı değil.</p>
        <p>Lütfen adresi kontrol edin veya ana sayfaya dönün.</p>
        <a href="{{ url('/') }}" class="button">Ana sayfaya dön</a>
    </div>
</body>
</html>

