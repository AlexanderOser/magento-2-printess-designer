<?php

namespace Digitalprint\PrintessDesigner\Block;

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Catalog\Pricing\Price\FinalPrice;
use Magento\ConfigurableProduct\Api\LinkManagementInterface;
use Magento\ConfigurableProduct\Model\Product\Type\Configurable;
use Magento\Customer\Model\Session;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Pricing\Render;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Framework\View\Element\Template;
use Magento\Framework\View\Element\Template\Context;
use Magento\Store\Model\ScopeInterface;

class Designer extends Template
{

    /**
     * @var Session
     */
    protected $customerSession;
    /**
     * @var SerializerInterface
     */
    protected $serializer;
    /**
     * @var ProductRepositoryInterface
     */
    protected $productRepository;
    /**
     * @var Configurable
     */
    private $configurable;
    /**
     * @var LinkManagementInterface
     */
    protected $linkManagement;
    /**
     * @var ScopeConfigInterface
     */
    protected $scopeConfig;

    /**
     * @var string
     */
    private const XML_PATH_DESIGNER_SHOP_TOKEN = 'designer/api_token/shop_token';
    /**
     * @var string
     */
    private const XML_PATH_DESIGNER_PRIMARY_COLOR = 'designer/colors/primary_color';
    /**
     * @var string
     */
    private const XML_PATH_DESIGNER_PRIMARY_COLOR_HOVER = 'designer/colors/primary_color_hover';

    /**
     * @param Context $context
     * @param Session $customerSession
     * @param SerializerInterface $serializer
     * @param ProductRepositoryInterface $productRepository
     * @param Configurable $configurable
     * @param LinkManagementInterface $linkManagement
     * @param ScopeConfigInterface $scopeConfig
     * @param array $data
     */
    public function __construct(
        Context $context,
        Session $customerSession,
        SerializerInterface $serializer,
        ProductRepositoryInterface $productRepository,
        Configurable $configurable,
        LinkManagementInterface $linkManagement,
        ScopeConfigInterface $scopeConfig,
        array $data = []
    ) {

        $this->customerSession = $customerSession;
        $this->serializer = $serializer;
        $this->productRepository = $productRepository;
        $this->configurable = $configurable;
        $this->linkManagement = $linkManagement;
        $this->scopeConfig = $scopeConfig;

        parent::__construct($context, $data);
    }

    public function _prepareLayout()
    {
        $this->pageConfig->getTitle()->set(sprintf("%s - %s", $this->getName(), __('Designer')));
        return parent::_prepareLayout();
    }

    /**
     * @return string
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    protected function getName(): string
    {
        $sku = $this->getRequest()->getParam('sku');
        $product = $this->productRepository->get($sku);

        return $product->getName();
    }


    /**
     * @param $product
     * @return string
     * @throws \Magento\Framework\Exception\LocalizedException
     */
    protected function renderPriceHtml($product): string
    {
        $priceRender = $this->getLayout()->getBlock('product.price.render.designer');

        $price = '';
        if ($priceRender) {
            $price = $priceRender->render(
                FinalPrice::PRICE_CODE,
                $product,
                [
                    'zone' => Render::ZONE_ITEM_LIST
                ]
            );
        }

        return $price;
    }

    /**
     * @return array
     */
    public function getCustomColors(): array
    {
        $storeScope = ScopeInterface::SCOPE_STORE;

        return [
            'primary_color' => $this->scopeConfig->getValue(self::XML_PATH_DESIGNER_PRIMARY_COLOR, $storeScope),
            'primary_color_hover' => $this->scopeConfig->getValue(self::XML_PATH_DESIGNER_PRIMARY_COLOR_HOVER, $storeScope),
        ];
    }

    /**
     * @return string
     * @throws \Magento\Framework\Exception\LocalizedException
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function getJsonVariants(): string
    {
        $variants = array();

        $sku = $this->getRequest()->getParam('sku');
        $product = $this->productRepository->get($sku);

        if ($product->getTypeId() === 'configurable') {

            $children = $this->linkManagement->getChildren($product->getSku());

            foreach($children as $child) {

                $childProduct = $this->productRepository->get($child->getSku());

                $attributes = array();

                $attributes[] = array(
                    'code' => 'printess_template',
                    'value' => $childProduct->getData('printess_template')
                );

                $attributes[] = array(
                    'code' => 'printess_document',
                    'value' => $childProduct->getData('printess_document')
                );

                $formFields = json_decode($childProduct->getData('printess_form_fields'), true);

                if (is_array($formFields)) {

                    foreach ($formFields as $formField) {

                        $attributes[] = array(
                            'code' => $formField['pim_attr_name'],
                            'value' => $formField['value']
                        );

                        $attributes[] = array(
                            'code' => $formField['printess_ff_name'],
                            'value' => $formField['value']
                        );

                    }
                }

                $attributes[] = array(
                    'code' => 'printess_form_fields',
                    'value' => $formFields
                );

                $variants[] = array(
                    'id' => $child->getId(),
                    'product_id' => $product->getId(),
                    'sku' => $child->getSku(),
                    'name' => $child->getName(),
                    'attributes' => $attributes,
                    'price' => $this->renderPriceHtml($childProduct)
                );

            }

        } else {

            $attributes = array();

            $attributes[] = array(
                'code' => 'printess_template',
                'value' => $product->getData('printess_template')
            );

            $attributes[] = array(
                'code' => 'printess_document',
                'value' => $product->getData('printess_document')
            );

            $formFields = json_decode($product->getData('printess_form_fields'), true);

            if (is_array($formFields)) {

                foreach ($formFields as $formField) {

                    $attributes[] = array(
                        'code' => $formField['pim_attr_name'],
                        'value' => $formField['value']
                    );

                    $attributes[] = array(
                        'code' => $formField['printess_ff_name'],
                        'value' => $formField['value']
                    );

                }
            }

            $attributes[] = array(
                'code' => 'printess_form_fields',
                'value' => $formFields
            );

            $variants[] = array(
                'id' => $product->getId(),
                'product_id' => $product->getId(),
                'sku' => $product->getSku(),
                'name' => $product->getName(),
                'attributes' => $attributes,
                'prices' => $this->renderPriceHtml($product)
            );

        }

        return $this->serializer->serialize($variants);

    }

    /**
     * @return string
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function getJsonConfig(): string
    {
        $storeScope = ScopeInterface::SCOPE_STORE;

        $sku = $this->getRequest()->getParam('sku');
        $superAttribute = $this->getRequest()->getParam('super_attribute');

        $product = $this->productRepository->get($sku);

        $saveToken = $this->getRequest()->getParam('save_token');

        $config = array();

        $config['shopToken'] = $this->scopeConfig->getValue(self::XML_PATH_DESIGNER_SHOP_TOKEN, $storeScope);
        $config['basketId'] = $this->customerSession->getSessionId();

        $config['shopUserId'] = $this->customerSession->isLoggedIn() ? $this->customerSession->getId() : 'CurrentShopCustomerId';

        $config['templateName'] = !is_null($saveToken) ? $saveToken : $product->getData('printess_template');

        $config['sku'] = $sku;
        $config['variant'] = $sku;
        $config['formFields'] = [];

        if (!is_null($superAttribute)) {

            $childProduct = $this->configurable->getProductByAttributes($superAttribute, $product);

            $config['variant'] = $childProduct->getSku();

            if (is_null($saveToken)) {

                $formFields = json_decode($childProduct->getData('printess_form_fields'), true);

                if (is_array($formFields)) {
                    foreach ($formFields as $formField) {
                        $config['formFields'][] = array(
                            'name' => $formField['printess_ff_name'],
                            'value' => $formField['value']
                        );
                    }
                }
            }

        }

        return $this->serializer->serialize($config);

    }

}
