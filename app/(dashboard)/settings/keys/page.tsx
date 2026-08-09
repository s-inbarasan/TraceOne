"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, Eye, EyeOff, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Loader2, Bot, Sparkles, Brain, Cpu, Zap } from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { GeminiLogo, OpenAILogo, AnthropicLogo, NvidiaLogo, GroqLogo } from "@/components/ui/ai-logos"

export default function ApiKeysPage() {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<any[]>([])
  const [keys, setKeys] = useState<Record<string, any>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [newKeyValues, setNewKeyValues] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({})

  const fetchKeysAndProviders = async () => {
    try {
      const res = await fetch('/api/keys')
      const data = await res.json()
      
      if (data.success) {
        // Exclude GitHub since it's handled via OAuth, we only want AI providers here
        const rawProviders = data.providers || []
        setProviders(rawProviders.filter((p: any) => p && p.name && p.name.toLowerCase() !== 'github'))
        
        const keyMap: Record<string, any> = {}
        if (data.keys) {
          data.keys.forEach((k: any) => {
            keyMap[k.provider_id] = k
          })
        }
        setKeys(keyMap)
      }
    } catch (err) {
      console.error("Failed to load API keys", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeysAndProviders()
  }, [])

  const toggleKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSaveKey = async (providerId: string) => {
    setValidating(prev => ({ ...prev, [providerId]: true }))
    setErrorMessages(prev => ({ ...prev, [providerId]: '' }))
    try {
      const val = newKeyValues[providerId]
      if (!val) return

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, api_key: val })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save API key. Please check your key configuration.")
      }
      
      await fetchKeysAndProviders()
      setEditing(prev => ({ ...prev, [providerId]: false }))
      setNewKeyValues(prev => ({ ...prev, [providerId]: '' }))
    } catch (err: any) {
      console.error("Failed to save key", err)
      setErrorMessages(prev => ({ ...prev, [providerId]: err.message || "Failed to save key" }))
    } finally {
      setValidating(prev => ({ ...prev, [providerId]: false }))
    }
  }

  const handleDeleteKey = async (providerId: string) => {
    try {
      const res = await fetch(`/api/keys?provider_id=${providerId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        await fetchKeysAndProviders()
      }
    } catch (err) {
      console.error("Failed to delete key", err)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">API Keys</h1>
        <p className="text-sm text-muted-foreground">Manage your AI provider keys used for investigations and patch generation.</p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => {
          const isConfigured = !!keys[provider.id]
          const isEditing = editing[provider.id]
          const keyData = keys[provider.id]

          return (
            <Card key={provider.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {provider.name.toLowerCase().includes('gemini') && <GeminiLogo className="size-6 flex-shrink-0" />}
                    {provider.name.toLowerCase().includes('openai') && <OpenAILogo className="size-6 flex-shrink-0" />}
                    {provider.name.toLowerCase().includes('anthropic') && <AnthropicLogo className="size-6 flex-shrink-0" />}
                    {provider.name.toLowerCase().includes('nvidia') && <NvidiaLogo className="size-6 flex-shrink-0" />}
                    {provider.name.toLowerCase().includes('groq') && <GroqLogo className="size-6 flex-shrink-0" />}
                    <span>{provider.name}</span>
                    {isConfigured ? (
                      <Badge variant="default" className="text-[10px] h-5 px-1.5 flex items-center gap-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                        <CheckCircle2 className="size-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">Not Configured</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isConfigured && keyData?.updated_at ? 
                      `Last updated: ${new Date(keyData.updated_at).toLocaleString()}` : 
                      'Used for root cause analysis and patch generation.'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured && !isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setEditing(prev => ({ ...prev, [provider.id]: true })); setNewKeyValues(prev => ({ ...prev, [provider.id]: keyData?.encrypted_key || '' })); }}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleDeleteKey(provider.id)}>
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </>
                  ) : !isConfigured && !isEditing ? (
                    <Button size="sm" className="gap-2" onClick={() => setEditing(prev => ({ ...prev, [provider.id]: true }))}>
                      <Plus className="size-4" />
                      Configure
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              
              {(isConfigured || isEditing) && (
                <CardContent>
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                            <Key className="size-4" />
                          </div>
                          <Input 
                            type={showKey[provider.id] ? "text" : "password"} 
                            placeholder={`Enter your ${provider.name} API Key`}
                            className="pl-9 pr-9 font-mono"
                            value={newKeyValues[provider.id] || ''}
                            onChange={(e) => setNewKeyValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                          />
                          <button 
                            type="button"
                            onClick={() => toggleKey(provider.id)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                          >
                            {showKey[provider.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        <Button 
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={!newKeyValues[provider.id] || validating[provider.id]}
                          className="min-w-[100px]"
                        >
                          {validating[provider.id] ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                          Save
                        </Button>
                      </div>
                      {errorMessages[provider.id] && (
                        <div className="text-sm text-red-500 font-medium flex items-start gap-1.5 bg-red-500/10 border border-red-500/20 p-2 rounded-md">
                          <AlertCircle className="size-4 mt-0.5 shrink-0" />
                          <span>{errorMessages[provider.id]}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="size-3.5" /> 
                        Keys are securely stored and never exposed in the browser.
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                          <Key className="size-4" />
                        </div>
                        <Input 
                          type={showKey[provider.id] ? "text" : "password"} 
                          value={keyData?.encrypted_key || ""} 
                          className="pl-9 font-mono"
                          readOnly
                        />
                        <button 
                          onClick={() => toggleKey(provider.id)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                        >
                          {showKey[provider.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
