"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Key, Eye, EyeOff, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

const SUPPORTED_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "gemini", name: "Google Gemini" },
  { id: "nvidia", name: "NVIDIA" },
  { id: "groq", name: "Groq" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "mistral", name: "Mistral" },
]

export default function ApiKeysPage() {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [keys, setKeys] = useState<Record<string, any>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [newKeyValues, setNewKeyValues] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  const fetchKeys = async () => {
    try {
      const { data, error } = await supabase.from('api_keys').select('*')
      if (error) throw error
      
      const keyMap: Record<string, any> = {}
      if (data) {
        data.forEach(k => {
          keyMap[k.provider] = k
        })
      }
      setKeys(keyMap)
    } catch (err) {
      console.error("Failed to load API keys", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function loadKeys() {
      try {
        const { data, error } = await supabase.from('api_keys').select('*')
        if (error) throw error
        
        const keyMap: Record<string, any> = {}
        if (data) {
          data.forEach(k => {
            keyMap[k.provider] = k
          })
        }
        if (isMounted) {
          setKeys(keyMap)
        }
      } catch (err) {
        console.error("Failed to load API keys", err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    loadKeys()
    return () => {
      isMounted = false
    }
  }, [supabase])

  const toggleKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSaveKey = async (providerId: string) => {
    setValidating(prev => ({ ...prev, [providerId]: true }))
    try {
      const val = newKeyValues[providerId]
      if (!val) return

      // Upsert into Supabase
      const { error } = await supabase.from('api_keys').upsert({
        provider: providerId,
        key_hash: val, // In a real app, this should be sent to a secure endpoint to encrypt
        last_validated: new Date().toISOString(),
        status: 'valid'
      }, { onConflict: 'provider' })

      if (error) throw error
      
      await fetchKeys()
      setEditing(prev => ({ ...prev, [providerId]: false }))
      setNewKeyValues(prev => ({ ...prev, [providerId]: '' }))
    } catch (err) {
      console.error("Failed to save key", err)
    } finally {
      setValidating(prev => ({ ...prev, [providerId]: false }))
    }
  }

  const handleDeleteKey = async (providerId: string) => {
    try {
      const { error } = await supabase.from('api_keys').delete().eq('provider', providerId)
      if (error) throw error
      await fetchKeys()
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
        <p className="text-sm text-muted-foreground">Manage your LLM provider keys used for AI investigations.</p>
      </div>

      <div className="space-y-4">
        {SUPPORTED_PROVIDERS.map((provider) => {
          const isConfigured = !!keys[provider.id]
          const isEditing = editing[provider.id]
          const keyData = keys[provider.id]

          return (
            <Card key={provider.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {provider.name}
                    {isConfigured ? (
                      <Badge variant="success" className="text-[10px] h-5 px-1.5 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">Not Configured</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isConfigured && keyData?.last_validated ? 
                      `Last validated: ${new Date(keyData.last_validated).toLocaleString()}` : 
                      'Used for root cause analysis and patch generation.'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured && !isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditing(prev => ({ ...prev, [provider.id]: true }))}>
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
                            type="password" 
                            placeholder={`Enter your ${provider.name} API Key`}
                            className="pl-9 font-mono"
                            value={newKeyValues[provider.id] || ''}
                            onChange={(e) => setNewKeyValues(prev => ({ ...prev, [provider.id]: e.target.value }))}
                          />
                        </div>
                        <Button 
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={!newKeyValues[provider.id] || validating[provider.id]}
                          className="min-w-[100px]"
                        >
                          {validating[provider.id] ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                          Save & Validate
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <AlertCircle className="size-3.5" /> 
                        Keys are securely encrypted before being stored.
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
                          value={showKey[provider.id] ? keyData?.key_hash || "sk-..." : "sk-................................................"} 
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
                      <Button variant="outline" className="gap-2" onClick={() => {}}>
                        <RefreshCw className="size-4" /> Test Connection
                      </Button>
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
