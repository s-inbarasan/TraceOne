const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/projects/[id]/page.tsx', 'utf8');

content = content.replace(/const \[prCreated, setPrCreated\] = useState\(false\)/, `const [prCreated, setPrCreated] = useState(false)
  const [configuredProviders, setConfiguredProviders] = useState<any[]>([])
  const [keysLoaded, setKeysLoaded] = useState(false)

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const res = await fetch('/api/keys')
        const data = await res.json()
        if (data.success && data.keys) {
          const configuredProviderIds = data.keys.map((k: any) => k.provider_id)
          const configured = data.providers.filter((p: any) => configuredProviderIds.includes(p.id))
          setConfiguredProviders(configured)
          
          if (configured.length > 0 && (!selectedModel || !configured.some((p: any) => selectedModel.toLowerCase().includes(p.name.toLowerCase())))) {
            // Pick default based on configured
            if (configured.some((p: any) => p.name.toLowerCase() === 'gemini')) {
              setSelectedModel('gemini-2.5-flash')
            } else if (configured.some((p: any) => p.name.toLowerCase() === 'openai')) {
              setSelectedModel('gpt-4o-mini')
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch keys", err)
      } finally {
        setKeysLoaded(true)
      }
    }
    fetchKeys()
  }, [])
`);

content = content.replace(/\/api\/gemini/g, '/api/ai');

// Replace the Model Provider select section
const selectRegex = /<label className="text-\[10px\] font-semibold text-muted-foreground uppercase">Model Provider<\/label>[\s\S]*?<\/select>/;
content = content.replace(selectRegex, `<label className="text-[10px] font-semibold text-muted-foreground uppercase">Model Provider</label>
                {keysLoaded && configuredProviders.length === 0 ? (
                  <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive text-center flex flex-col gap-2">
                    <span>Configure an AI provider in Settings to start debugging.</span>
                    <Link href="/settings/keys">
                      <Button variant="outline" size="sm" className="w-full text-[10px] h-6 bg-background">Settings</Button>
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                    disabled={!keysLoaded}
                  >
                    {!keysLoaded && <option>Loading...</option>}
                    {configuredProviders.some(p => p.name.toLowerCase() === 'gemini') && (
                      <>
                        <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Google Gemini 2.5 Pro</option>
                      </>
                    )}
                    {configuredProviders.some(p => p.name.toLowerCase() === 'openai') && (
                      <>
                        <option value="gpt-4o">OpenAI GPT-4o</option>
                        <option value="gpt-4o-mini">OpenAI GPT-4o Mini</option>
                      </>
                    )}
                    {configuredProviders.some(p => p.name.toLowerCase() === 'anthropic') && (
                      <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                    )}
                  </select>
                )}`);

fs.writeFileSync('app/(dashboard)/projects/[id]/page.tsx', content);
