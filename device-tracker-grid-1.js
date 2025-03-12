/**
 * Device Tracker Grid Card para Home Assistant
 * 
 * Este componente mostra todas as entidades device_tracker que possuem o atributo MAC
 * em um grid com as seguintes colunas:
 * - Nome (atributo name)
 * - MAC (atributo mac)
 * - IP (atributo ip)
 * 
 * Cada linha possui um botão para reconectar o dispositivo chamando um serviço do HA.
 * 
 * Versão: 1.0.0
 */

class DeviceTrackerGrid extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Cache para elementos DOM e estados
    this._cache = {
      elements: {},
      lastStates: {},
      deviceList: []
    };
    
    // Configurar estilos
    this._setupStyles();
    
    // Flags para controle de renderização
    this._isInitialRender = true;
    this._updateTimerId = null;
  }

  setConfig(config) {
    this.config = {
      title: config.title || 'Dispositivos Rastreados',
      service: config.service || 'tplink_omada.reconnect_client',
      service_domain: config.service_domain || 'tplink_omada',
      service_action: config.service_action || 'reconnect_client',
      mac_param: config.mac_param || 'mac',
      format_mac: config.format_mac !== false, // Por padrão, formata o MAC
      columns_order: config.columns_order || ['name', 'mac', 'ip', 'actions'],
      show_offline: config.show_offline !== false, // Por padrão, mostra dispositivos offline
      filter_by_entity: config.filter_by_entity || [],
      max_devices: config.max_devices || 0, // 0 = sem limite
      sort_by: config.sort_by || 'name',
      sort_order: config.sort_order || 'asc',
      state_text: config.state_text || true,
      alternating_rows: config.alternating_rows !== false
    };
    
    this._isInitialRender = true;
  }

  set hass(hass) {
    this._hass = hass;
    
    // Atualizar a lista de dispositivos e verificar mudanças
    if (this._updateDeviceList() || this._isInitialRender) {
      this._throttledUpdate();
    }
  }

  _updateDeviceList() {
    if (!this._hass) return false;
    
    const newDeviceList = [];
    let hasChanges = false;
    
    // Obter todas as entidades do tipo device_tracker
    Object.entries(this._hass.states).forEach(([entityId, stateObj]) => {
      if (entityId.startsWith('device_tracker.')) {
        // Verificar se a entidade tem o atributo MAC
        const macAttribute = stateObj.attributes.mac;
        
        if (macAttribute) {
          // Verificar filtros
          if (this.config.filter_by_entity.length > 0 && 
              !this.config.filter_by_entity.includes(entityId)) {
            return;
          }
          
          // Verificar se deve mostrar dispositivos offline
          if (!this.config.show_offline && stateObj.state === 'not_home') {
            return;
          }
          
          const device = {
            entity_id: entityId,
            name: stateObj.attributes.friendly_name || entityId.split('.')[1],
            mac: macAttribute,
            ip: stateObj.attributes.ip || '',
            state: stateObj.state,
            last_changed: stateObj.last_changed,
            last_updated: stateObj.last_updated,
            attributes: stateObj.attributes
          };
          
          newDeviceList.push(device);
          
          // Verificar se houve mudanças neste dispositivo
          const deviceKey = `${entityId}_${stateObj.state}_${device.ip}_${device.mac}`;
          if (!this._cache.lastStates[entityId] || this._cache.lastStates[entityId] !== deviceKey) {
            this._cache.lastStates[entityId] = deviceKey;
            hasChanges = true;
          }
        }
      }
    });
    
    // Ordenar a lista
    this._sortDeviceList(newDeviceList);
    
    // Aplicar limite máximo de dispositivos
    if (this.config.max_devices > 0 && newDeviceList.length > this.config.max_devices) {
      newDeviceList.length = this.config.max_devices;
    }
    
    // Verificar se a lista mudou de tamanho
    if (this._cache.deviceList.length !== newDeviceList.length) {
      hasChanges = true;
    }
    
    this._cache.deviceList = newDeviceList;
    return hasChanges;
  }

  _sortDeviceList(deviceList) {
    const { sort_by, sort_order } = this.config;
    
    deviceList.sort((a, b) => {
      let valA = a[sort_by];
      let valB = b[sort_by];
      
      // Tratar valores null ou undefined
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      
      // Converter para minúsculas para ordenação case-insensitive se for string
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return sort_order === 'asc' ? -1 : 1;
      if (valA > valB) return sort_order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  _throttledUpdate() {
    if (this._updateTimerId !== null) {
      clearTimeout(this._updateTimerId);
    }
    
    this._updateTimerId = setTimeout(() => {
      this._updateTimerId = null;
      this._updateCard();
    }, 100); // 100ms de debounce
  }

  _updateCard() {
    if (!this._hass || !this.config) return;
    
    if (this._isInitialRender) {
      this._renderCard();
      this._isInitialRender = false;
    } else {
      this._updateGrid();
    }
  }

  _setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --primary-color: var(--card-primary-color, var(--primary-color));
        --text-color: var(--card-text-color, var(--primary-text-color));
        --secondary-text-color: var(--card-secondary-text-color, var(--secondary-text-color));
        --background-color: var(--card-background-color, var(--card-background-color, var(--ha-card-background)));
        --secondary-background-color: var(--card-secondary-background-color, var(--secondary-background-color));
        --border-color: var(--card-border-color, var(--divider-color));
        --shadow-color: var(--card-shadow-color, rgba(0,0,0,0.08));
        --border-radius: var(--card-border-radius, var(--ha-card-border-radius, 12px));
      }
      
      ha-card {
        border-radius: var(--border-radius);
        background-color: var(--background-color);
        color: var(--text-color);
        box-shadow: 0 4px 15px var(--shadow-color);
        overflow: hidden;
      }
      
      .card-header {
        padding: 14px 20px;
        background-color: var(--background-color);
        color: var(--text-color);
        font-weight: 500;
        font-size: 18px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .header-left {
        display: flex;
        align-items: center;
        flex: 1;
      }
      
      .header-icon {
        margin-right: 10px;
        color: var(--primary-color);
        font-size: 20px;
        display: flex;
        align-items: center;
      }
      
      .card-content {
        padding: 12px 16px;
        overflow-x: auto;
      }
      
      .grid-container {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      
      .grid-container th {
        text-align: left;
        padding: 8px 12px;
        color: var(--secondary-text-color);
        font-weight: 500;
        font-size: 14px;
        border-bottom: 1px solid var(--border-color);
        white-space: nowrap;
      }
      
      .grid-container td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        white-space: nowrap;
      }
      
      .grid-container tr:last-child td {
        border-bottom: none;
      }
      
      .grid-container tr.alternate {
        background-color: var(--secondary-background-color);
      }
      
      .device-state {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 8px;
      }
      
      .state-home {
        background-color: #2ecc71;
      }
      
      .state-not_home {
        background-color: #e74c3c;
      }
      
      .state-unknown {
        background-color: #95a5a6;
      }
      
      .mac-address {
        font-family: monospace;
        font-size: 13px;
      }
      
      .ip-address {
        font-family: monospace;
        font-size: 13px;
      }
      
      .reconnect-button {
        background-color: #1a4b8c;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 4px rgba(26, 75, 140, 0.2);
      }
      
      .reconnect-button:hover {
        background-color: #0D3880;
      }
      
      .reconnect-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .empty-message {
        padding: 24px;
        text-align: center;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-icon {
        animation: spin 1s linear infinite;
      }
    `;
    
    this.shadowRoot.appendChild(style);
  }

  _renderCard() {
    // Limpar conteúdo anterior
    this.shadowRoot.innerHTML = '';
    this._setupStyles();
    
    const card = document.createElement('ha-card');
    this.shadowRoot.appendChild(card);
    
    // Cabeçalho
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const headerLeft = document.createElement('div');
    headerLeft.className = 'header-left';
    headerLeft.innerHTML = `
      <span class="header-icon"><ha-icon icon="mdi:router-wireless"></ha-icon></span>
      ${this.config.title}
    `;
    
    cardHeader.appendChild(headerLeft);
    card.appendChild(cardHeader);
    
    // Conteúdo
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    card.appendChild(cardContent);
    
    // Grid de dispositivos
    if (this._cache.deviceList.length > 0) {
      const gridContainer = document.createElement('table');
      gridContainer.className = 'grid-container';
      
      // Cabeçalhos
      const headerRow = document.createElement('tr');
      
      this.config.columns_order.forEach(column => {
        if (column === 'name') {
          const th = document.createElement('th');
          th.textContent = 'Nome';
          headerRow.appendChild(th);
        } else if (column === 'mac') {
          const th = document.createElement('th');
          th.textContent = 'MAC';
          headerRow.appendChild(th);
        } else if (column === 'ip') {
          const th = document.createElement('th');
          th.textContent = 'IP';
          headerRow.appendChild(th);
        } else if (column === 'actions') {
          const th = document.createElement('th');
          th.textContent = '';
          headerRow.appendChild(th);
        }
      });
      
      const thead = document.createElement('thead');
      thead.appendChild(headerRow);
      gridContainer.appendChild(thead);
      
      // Corpo da tabela
      const tbody = document.createElement('tbody');
      gridContainer.appendChild(tbody);
      
      // Armazenar referência para atualizações
      this._cache.elements = {
        card,
        gridContainer,
        tbody
      };
      
      cardContent.appendChild(gridContainer);
      
      // Inicializar a grid com os dispositivos
      this._updateGrid();
    } else {
      // Mensagem de vazio
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.innerHTML = 'Nenhum dispositivo encontrado com as configurações atuais.';
      cardContent.appendChild(emptyMessage);
    }
  }

  _updateGrid() {
    if (!this._cache.elements.tbody) return;
    
    const tbody = this._cache.elements.tbody;
    tbody.innerHTML = '';
    
    this._cache.deviceList.forEach((device, index) => {
      const row = document.createElement('tr');
      
      // Aplicar estilo alternado para as linhas
      if (this.config.alternating_rows && index % 2 === 1) {
        row.className = 'alternate';
      }
      
      this.config.columns_order.forEach(column => {
        if (column === 'name') {
          const td = document.createElement('td');
          
          // Se configurado para mostrar o estado como texto
          if (this.config.state_text) {
            const stateIndicator = document.createElement('span');
            stateIndicator.className = `device-state state-${device.state}`;
            td.appendChild(stateIndicator);
          }
          
          const nameSpan = document.createElement('span');
          nameSpan.textContent = device.name;
          td.appendChild(nameSpan);
          
          row.appendChild(td);
        } else if (column === 'mac') {
          const td = document.createElement('td');
          td.className = 'mac-address';
          td.textContent = device.mac;
          row.appendChild(td);
        } else if (column === 'ip') {
          const td = document.createElement('td');
          td.className = 'ip-address';
          td.textContent = device.ip || 'N/A';
          row.appendChild(td);
        } else if (column === 'actions') {
          const td = document.createElement('td');
          
          const reconnectButton = document.createElement('button');
          reconnectButton.className = 'reconnect-button';
          reconnectButton.innerHTML = '<ha-icon icon="mdi:refresh"></ha-icon> Reconectar';
          reconnectButton.addEventListener('click', () => this._reconnectDevice(device, reconnectButton));
          
          td.appendChild(reconnectButton);
          row.appendChild(td);
        }
      });
      
      tbody.appendChild(row);
    });
  }

  _reconnectDevice(device, button) {
    if (!this._hass || !device.mac) return;
    
    const originalButtonText = button.innerHTML;
    
    // Feedback visual
    button.innerHTML = '<ha-icon icon="mdi:loading" class="loading-icon"></ha-icon> Reconectando...';
    button.style.backgroundColor = '#0D3880';
    button.disabled = true;
    
    let macAddress = device.mac;
    
    // Formatar MAC se configurado para isso
    if (this.config.format_mac) {
      macAddress = macAddress.replace(/:/g, '-').toUpperCase();
    }
    
    // Parâmetros para o serviço
    const params = {};
    params[this.config.mac_param] = macAddress;
    
    this._hass.callService(
      this.config.service_domain,
      this.config.service_action,
      params
    ).then(() => {
      button.innerHTML = '<ha-icon icon="mdi:check"></ha-icon> Enviado!';
      button.style.backgroundColor = '#2ecc71';
      
      setTimeout(() => {
        this._restoreButton(button, originalButtonText);
      }, 3000);
    }).catch(error => {
      console.error('Erro ao reconectar dispositivo:', error);
      button.innerHTML = '<ha-icon icon="mdi:alert"></ha-icon> Erro!';
      button.style.backgroundColor = '#e74c3c';
      
      setTimeout(() => {
        this._restoreButton(button, originalButtonText);
      }, 3000);
    });
  }

  _restoreButton(button, originalText) {
    button.innerHTML = originalText;
    button.disabled = false;
    button.style.backgroundColor = '#1a4b8c';
  }

  getCardSize() {
    return 1 + Math.min(this._cache.deviceList.length, 5);
  }
}

// Registra o card personalizado
customElements.define('device-tracker-grid', DeviceTrackerGrid);

// Informações para o HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'device-tracker-grid',
  name: 'Device Tracker Grid',
  description: 'Grid de dispositivos rastreados com informações de nome, MAC, IP e botão para reconectar'
});
