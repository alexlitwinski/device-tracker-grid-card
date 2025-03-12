# Device Tracker Grid Card

Um card personalizado para Home Assistant que exibe todas as entidades `device_tracker` que possuem o atributo MAC em um grid organizado.

![Device Tracker Grid Card](images/device-tracker-grid.png)

## Características

- Exibe entidades `device_tracker` em um grid com colunas para Nome, MAC e IP
- Botão para reconectar dispositivos
- Filtragem de dispositivos com várias opções de configuração
- Indicadores visuais de status para dispositivos online/offline
- Personalização de cores e estilos
- Compatível com temas do Home Assistant

## Instalação

### HACS (recomendado)

1. Certifique-se de ter o [HACS](https://hacs.xyz/) instalado
2. Vá para HACS > Frontend
3. Clique no botão "+ Explorar e adicionar repositórios"
4. Pesquise por "Device Tracker Grid"
5. Clique em "Instalar"
6. Reinicie o Home Assistant

### Instalação manual

1. Baixe o arquivo `device-tracker-grid.js` deste repositório
2. Copie-o para o diretório `config/www/` do seu Home Assistant
3. Adicione o seguinte na seção `frontend:` do seu arquivo `configuration.yaml`:
```yaml
frontend:
  extra_module_url:
    - /local/device-tracker-grid.js
```
4. Reinicie o Home Assistant

## Uso

Adicione o card à sua interface do Lovelace:

```yaml
type: custom:device-tracker-grid
title: Meus Dispositivos Rastreados
```

### Exemplo completo

```yaml
type: custom:device-tracker-grid
title: Dispositivos na Rede
service_domain: tplink_omada
service_action: reconnect_client
mac_param: mac
format_mac: true
columns_order:
  - name
  - ip
  - mac
  - actions
show_offline: true
sort_by: name
sort_order: asc
alternating_rows: true
```

## Opções de configuração

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `title` | string | `'Dispositivos Rastreados'` | Título exibido no topo do card |
| `service_domain` | string | `'tplink_omada'` | Domínio do serviço para reconectar dispositivos |
| `service_action` | string | `'reconnect_client'` | Ação do serviço para reconectar dispositivos |
| `mac_param` | string | `'mac'` | Nome do parâmetro para enviar o MAC ao serviço |
| `format_mac` | boolean | `true` | Se deve formatar o MAC antes de enviar (substitui `:` por `-` e converte para maiúsculas) |
| `columns_order` | array | `['name', 'mac', 'ip', 'actions']` | Ordem das colunas a serem exibidas |
| `show_offline` | boolean | `true` | Se deve mostrar dispositivos offline |
| `filter_by_entity` | array | `[]` | Lista de entity_ids para filtrar (vazio mostra todos) |
| `max_devices` | number | `0` | Número máximo de dispositivos a mostrar (0 = sem limite) |
| `sort_by` | string | `'name'` | Campo pelo qual ordenar (`name`, `mac`, `ip`, `state`) |
| `sort_order` | string | `'asc'` | Ordem de classificação (`asc` ou `desc`) |
| `state_text` | boolean | `true` | Mostrar indicador visual de estado |
| `alternating_rows` | boolean | `true` | Usar cores alternadas nas linhas |

## Configurando o serviço de reconexão

Este card foi projetado para funcionar com qualquer serviço do Home Assistant que possa reconectar dispositivos de rede. Por padrão, ele usa o serviço `tplink_omada.reconnect_client`, adequado para usuários do TP-Link Omada Controller.

Para outros sistemas, ajuste as configurações de serviço conforme necessário:

### Exemplo para UniFi

```yaml
type: custom:device-tracker-grid
service_domain: unifi
service_action: reconnect
mac_param: device
```

## Solução de problemas

- Verifique se suas entidades `device_tracker` possuem o atributo `mac`
- Certifique-se de que o serviço de reconexão está configurado corretamente
- Para uma formatação específica de MAC, ajuste a opção `format_mac`

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para enviar pull requests com melhorias.

## Licença

[MIT](LICENSE)
